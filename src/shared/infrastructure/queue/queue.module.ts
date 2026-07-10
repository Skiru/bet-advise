import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqsMessageQueueAdapter } from './sqs-message-queue.adapter';
import { SqsConsumerService } from './sqs-consumer.service';
import { ProcessedMessageEntity } from './entities/processed-message.entity';
import { MessageQueuePortToken } from '../../application/queue/message-queue.port';
import { AuditModule } from '../../../audit/audit.module';
import { PublicIntegrationService } from '../integration/public-integration.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessedMessageEntity]), AuditModule],
  providers: [
    SqsConsumerService,
    PublicIntegrationService,
    {
      provide: MessageQueuePortToken,
      useClass: SqsMessageQueueAdapter,
    },
  ],
  exports: [MessageQueuePortToken, PublicIntegrationService],
})
export class QueueModule {}
