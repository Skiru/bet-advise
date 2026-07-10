/* eslint-disable */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEventEntity } from '../infrastructure/entities/outbox-event.entity';
import { MessageQueuePortToken } from '../../shared/application/queue/message-queue.port';
import type { MessageQueuePort } from '../../shared/application/queue/message-queue.port';

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly queueUrl: string;

  private intervalId: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject(MessageQueuePortToken)
    private readonly messageQueue: MessageQueuePort,
    private readonly configService: ConfigService,
  ) {
    this.enabled =
      this.configService.get<boolean>('sqs.outboxRelayEnabled') !== false;
    this.intervalMs =
      this.configService.get<number>('sqs.outboxRelayIntervalMs') || 5000;
    this.batchSize =
      this.configService.get<number>('sqs.outboxRelayBatchSize') || 10;
    this.maxAttempts =
      this.configService.get<number>('sqs.outboxRelayMaxAttempts') || 5;
    this.queueUrl = this.configService.get<string>('sqs.queueUrl') || '';
  }

  onModuleInit() {
    if (this.enabled && this.queueUrl) {
      this.logger.log(
        `Starting Outbox Relay loop with interval of ${this.intervalMs}ms...`,
      );
      this.intervalId = setInterval(() => {
        this.processOutbox().catch((err) => {
          this.logger.error('Unhandled error in outbox relay cycle:', err);
        });
      }, this.intervalMs);
    } else {
      this.logger.warn('Outbox Relay is disabled or queue URL is not set.');
    }
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log('Outbox Relay stopped.');
  }

  async processOutbox() {
    if (this.processing) {
      this.logger.debug(
        'Outbox Relay execution skipped: previous process still running.',
      );
      return;
    }

    this.processing = true;
    try {
      const events = await this.outboxRepo.find({
        where: {
          status: 'PENDING',
        },
        order: {
          createdAt: 'ASC',
        },
        take: this.batchSize,
      });

      if (events.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${events.length} pending outbox events to relay...`,
      );

      for (const event of events) {
        await this.relayEvent(event);
      }
    } catch (error) {
      this.logger.error('Error during outbox relay processing:', error);
    } finally {
      this.processing = false;
    }
  }

  private async relayEvent(event: OutboxEventEntity) {
    try {
      const messageBody = {
        eventId: event.id,
        tenantId: event.tenantId,
        type: event.type,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.createdAt.toISOString(),
        schemaVersion: '1.0.0',
      };

      const attributes = {
        eventType: event.type,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        tenantId: event.tenantId,
      };

      await this.messageQueue.publish(this.queueUrl, messageBody, attributes);

      await this.outboxRepo.update(event.id, {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });

      this.logger.log(`Event ${event.id} successfully relayed to SQS`);
    } catch (error: any) {
      const nextAttempt = event.attemptCount + 1;
      const status = nextAttempt >= this.maxAttempts ? 'FAILED' : 'PENDING';

      this.logger.error(
        `Failed to relay event ${event.id}. Attempt ${nextAttempt}/${this.maxAttempts}. Setting status to ${status}. Error:`,
        error,
      );

      await this.outboxRepo.update(event.id, {
        attemptCount: nextAttempt,
        lastError: error.message || String(error),
        status,
      });
    }
  }
}
