import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('processed_messages')
export class ProcessedMessageEntity {
  @PrimaryColumn()
  eventId!: string;

  @PrimaryColumn()
  handlerName!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  processedAt!: Date;
}
