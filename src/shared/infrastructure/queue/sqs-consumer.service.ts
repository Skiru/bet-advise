/* eslint-disable */
import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { SQS_CLIENT } from '../aws/aws-client-tokens';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedMessageEntity } from './entities/processed-message.entity';
import { AuditLogService } from '../../../audit/application/audit-log.service';
import { TenantContext } from '../tenant/tenant-context';
import { PublicIntegrationService } from '../integration/public-integration.service';

@Injectable()
export class SqsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly queueUrl: string;
  private readonly waitTimeSeconds: number;
  private readonly maxNumberOfMessages: number;
  private readonly consumerEnabled: boolean;

  private running = false;
  private pollPromise: Promise<void> | null = null;

  constructor(
    @Inject(SQS_CLIENT) private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
    @InjectRepository(ProcessedMessageEntity)
    private readonly processedRepo: Repository<ProcessedMessageEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly tenantContext: TenantContext,
    private readonly publicIntegrationService: PublicIntegrationService,
  ) {
    this.queueUrl = this.configService.get<string>('sqs.queueUrl') || '';
    this.waitTimeSeconds =
      this.configService.get<number>('sqs.waitTimeSeconds') || 20;
    this.maxNumberOfMessages =
      this.configService.get<number>('sqs.maxNumberOfMessages') || 10;
    this.consumerEnabled =
      this.configService.get<boolean>('sqs.consumerEnabled') !== false;
  }

  onModuleInit() {
    if (this.consumerEnabled && this.queueUrl) {
      this.logger.log('Starting SQS consumer polling loop...');
      this.running = true;
      this.pollPromise = this.pollLoop();
    } else {
      this.logger.warn('SQS consumer is disabled or queue URL is missing.');
    }
  }

  async onModuleDestroy() {
    this.logger.log('Stopping SQS consumer...');
    this.running = false;
    if (this.pollPromise) {
      await this.pollPromise;
    }
    this.logger.log('SQS consumer stopped.');
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            WaitTimeSeconds: this.waitTimeSeconds,
            MaxNumberOfMessages: this.maxNumberOfMessages,
            AttributeNames: ['All'],
            MessageAttributeNames: ['All'],
          }),
        );

        const messages = response.Messages || [];
        if (messages.length > 0) {
          this.logger.log(`Received ${messages.length} messages from SQS`);
          for (const message of messages) {
            await this.processMessageWithRetry(message);
          }
        }
      } catch (error) {
        this.logger.error('Error polling messages from SQS:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processMessageWithRetry(message: any): Promise<void> {
    const body = JSON.parse(message.Body || '{}');
    const eventId = body.eventId || message.MessageId;
    const eventType = body.type;
    const handlerName = 'SqsConsumerService';

    if (!eventType) {
      this.logger.warn(
        `Message is missing 'type'. Deleting message. Content: ${message.Body}`,
      );
      await this.deleteMessage(message.ReceiptHandle);
      return;
    }

    this.logger.log(`Processing message ${eventId} of type ${eventType}`);

    let reserved = false;
    try {
      // 1. Inbox Pattern: Attempt atomic reservation using DB primary key constraint
      try {
        await this.processedRepo.save(
          this.processedRepo.create({
            eventId,
            handlerName,
          }),
        );
        reserved = true;
      } catch (dbError: any) {
        // Code 23505 is standard PG unique violation. Or we just catch any insert failure as duplicate
        this.logger.warn(
          `Message ${eventId} already processed/reserved by ${handlerName}. Skipping and deleting.`,
        );
        await this.deleteMessage(message.ReceiptHandle);
        return;
      }

      // 2. Process message contents within the original tenant context
      const tenantId = body.tenantId || 'default';
      await this.tenantContext.run(tenantId, async () => {
        if (eventType === 'ADVICE_GENERATED') {
          const payload = body.payload || {};
          const adviceId = payload.adviceId;

          // Log audit event within tenant context
          await this.auditLogService.log(
            'ADVICE_MESSAGE_PROCESSED',
            'Advice',
            adviceId || 'unknown',
            'system',
            { eventId, payload },
          );

          // Dispatch integration webhook call
          await this.publicIntegrationService.sendAdviceGenerated({
            adviceId,
            tenantId,
            matchId: payload.matchId,
            market: payload.market,
            selection: payload.selection,
            confidence: payload.confidence,
          });

          this.logger.log(
            `Successfully processed ADVICE_GENERATED event: ${eventId} for Advice ID: ${adviceId} (Tenant: ${tenantId})`,
          );
        } else {
          this.logger.warn(`Unknown message type: ${eventType}. Ignoring.`);
        }
      });

      // 3. Delete from SQS only after successful commit/processing
      await this.deleteMessage(message.ReceiptHandle);
    } catch (error) {
      this.logger.error(`Failed to process SQS message:`, error);
      // Rollback reservation so the message can be safely retried by SQS visibility logic
      if (reserved) {
        try {
          await this.processedRepo.delete({ eventId, handlerName });
        } catch (delError) {
          this.logger.error(
            `Failed to rollback reservation for message ${eventId}:`,
            delError,
          );
        }
      }
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to delete message from SQS:', error);
    }
  }
}
