import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxRelayService } from './application/outbox-relay.service';
import { OutboxEventEntity } from './infrastructure/entities/outbox-event.entity';
import { QueueModule } from '../shared/infrastructure/queue/queue.module';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEventEntity]), QueueModule],
  providers: [OutboxRelayService],
  exports: [OutboxRelayService],
})
export class OutboxModule {}
