/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
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
      return;
    }

    this.processing = true;
    try {
      // Atomic Batch Claiming using FOR UPDATE SKIP LOCKED
      const claimedEvents = await this.outboxRepo.manager.transaction(
        async (txManager) => {
          const rawRows = await txManager.query(
            `SELECT id FROM outbox_events 
           WHERE status = 'PENDING' AND next_attempt_at <= NOW()
           ORDER BY created_at ASC 
           LIMIT $1 
           FOR UPDATE SKIP LOCKED`,
            [this.batchSize],
          );

          if (rawRows.length === 0) {
            return [];
          }

          const ids = rawRows.map((r: any) => r.id);
          const ownerId = `worker-${process.pid}-${Date.now()}`;
          const leaseUntil = new Date(Date.now() + 60000); // 1-minute lease

          await txManager.query(
            `UPDATE outbox_events 
           SET status = 'CLAIMED', 
               claim_owner = $1, 
               claimed_at = NOW(), 
               lease_until = $2,
               updated_at = NOW()
           WHERE id = ANY($3)`,
            [ownerId, leaseUntil, ids],
          );

          return txManager
            .createQueryBuilder(OutboxEventEntity, 'event')
            .where('event.id IN (:...ids)', { ids })
            .getMany();
        },
      );

      if (claimedEvents.length === 0) {
        return;
      }

      this.logger.log(
        `Claimed ${claimedEvents.length} outbox events to relay...`,
      );

      for (const event of claimedEvents) {
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
        payloadChecksum: event.payloadChecksum,
        correlationId: event.correlationId,
        causationId: event.causationId,
        occurredAt: event.createdAt.toISOString(),
        producer: 'bet-advise-backend',
        schemaVersion: event.schemaVersion,
      };

      const attributes = {
        eventType: event.type,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.causationId,
      };

      await this.messageQueue.publish(this.queueUrl, messageBody, attributes);

      await this.outboxRepo.update(event.id, {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.log(`Event ${event.id} successfully relayed to SQS`);
    } catch (error: any) {
      const nextAttempt = event.attemptCount + 1;
      const status = nextAttempt >= this.maxAttempts ? 'FAILED' : 'PENDING';

      // Calculate exponential backoff with a bit of jitter (e.g., base 2s)
      const baseDelayMs = 2000;
      const backoffMs =
        Math.min(60000, baseDelayMs * Math.pow(2, nextAttempt)) +
        Math.random() * 1000;
      const nextAttemptAt = new Date(Date.now() + backoffMs);

      // Redact stack traces and sensitive error words
      const errorMsg = (error.message || String(error)).substring(0, 500);

      this.logger.error(
        `Failed to relay event ${event.id}. Attempt ${nextAttempt}/${this.maxAttempts}. Error: ${errorMsg}`,
      );

      await this.outboxRepo.update(event.id, {
        attemptCount: nextAttempt,
        lastErrorCode: error.code || 'RELAY_ERROR',
        lastErrorSummary: errorMsg,
        status,
        nextAttemptAt,
        updatedAt: new Date(),
      });
    }
  }
}
