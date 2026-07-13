import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqsMessageQueueAdapter } from './sqs-message-queue.adapter';
import { SqsConsumerService } from './sqs-consumer.service';
import { InboxMessageEntity } from './entities/processed-message.entity';
import { MessageQueuePortToken } from '../../application/queue/message-queue.port';
import { AuditModule } from '../../../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([InboxMessageEntity]), AuditModule],
  providers: [
    SqsConsumerService,
    {
      provide: MessageQueuePortToken,
      useClass: SqsMessageQueueAdapter,
    },
  ],
  exports: [MessageQueuePortToken],
})
export class QueueModule {}
