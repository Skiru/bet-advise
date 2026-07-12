/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
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
import { InboxMessageEntity } from './entities/processed-message.entity';
import { AuditLogService } from '../../../audit/application/audit-log.service';
import { TenantContext } from '../tenant/tenant-context';

@Injectable()
export class SqsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly queueUrl: string;
  private readonly waitTimeSeconds: number;
  private readonly maxNumberOfMessages: number;
  private readonly consumerEnabled: boolean;

  private running = false;
  private pollPromise: Promise<void> | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(
    @Inject(SQS_CLIENT) private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
    @InjectRepository(InboxMessageEntity)
    private readonly inboxRepo: Repository<InboxMessageEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly tenantContext: TenantContext,
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

      // Prune messages older than 7 days daily
      this.cleanupIntervalId = setInterval(
        () => {
          this.pruneOldInboxMessages().catch((err) => {
            this.logger.error('Failed to prune old processed messages:', err);
          });
        },
        24 * 60 * 60 * 1000,
      );

      this.pruneOldInboxMessages().catch((err) => {
        this.logger.error('Failed to trigger initial message pruning:', err);
      });
    } else {
      this.logger.warn('SQS consumer is disabled or queue URL is missing.');
    }
  }

  async onModuleDestroy() {
    this.logger.log('Stopping SQS consumer...');
    this.running = false;
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    if (this.pollPromise) {
      await this.pollPromise;
    }
    this.logger.log('SQS consumer stopped.');
  }

  private async pruneOldInboxMessages(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await this.inboxRepo
        .createQueryBuilder()
        .delete()
        .from(InboxMessageEntity)
        .where('processedAt < :cutoff', { cutoff })
        .execute();
      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Pruned old inbox message records. Deleted count: ${result.affected}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to prune old inbox message entries:', error);
    }
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
    const eventType = body.type || body.eventType;
    const handlerName = 'SqsConsumerService';

    if (!eventType) {
      this.logger.warn(
        `Message is missing 'type'. Deleting message. ID: ${eventId}`,
      );
      await this.deleteMessage(message.ReceiptHandle);
      return;
    }

    let tenantId = body.tenantId || 'default';
    tenantId = tenantId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');

    if (!tenantId) {
      this.logger.warn(
        `Message is missing valid tenantId. Deleting message. ID: ${eventId}`,
      );
      await this.deleteMessage(message.ReceiptHandle);
      return;
    }

    const inboxId = `${tenantId}:${eventId}:${handlerName}`;

    let reserved = false;
    try {
      // 1. Inbox reservation transactionally
      try {
        await this.inboxRepo.save(
          this.inboxRepo.create({
            id: inboxId,
            tenantId,
          }),
        );
        reserved = true;
      } catch (dbError: any) {
        this.logger.warn(
          `Message ${eventId} already processed/reserved. Skipping.`,
        );
        await this.deleteMessage(message.ReceiptHandle);
        return;
      }

      // 2. Process within the tenant context scope
      await this.tenantContext.run(tenantId, async () => {
        if (eventType === 'ADVICE_GENERATED') {
          const payload = body.payload || {};
          const adviceId = payload.adviceId || 'unknown';

          await this.auditLogService.log(
            'ADVICE_MESSAGE_PROCESSED',
            'Advice',
            adviceId,
            'system',
            { eventId, payload },
          );

          this.logger.log(
            `Processed ADVICE_GENERATED event: ${eventId} for Advice: ${adviceId}`,
          );
        } else {
          this.logger.warn(`Unknown message type: ${eventType}. Skipping.`);
        }
      });

      // 3. Delete from SQS
      await this.deleteMessage(message.ReceiptHandle);
    } catch (error) {
      this.logger.error(`Failed to process SQS message:`, error);
      if (reserved) {
        try {
          await this.inboxRepo.delete({ id: inboxId });
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
