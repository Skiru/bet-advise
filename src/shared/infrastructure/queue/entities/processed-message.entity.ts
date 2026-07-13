import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('inbox_messages')
export class InboxMessageEntity {
  @PrimaryColumn()
  id!: string; // Format: tenantId + eventId + handlerName

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamp with time zone' })
  processedAt!: Date;
}
export { InboxMessageEntity as ProcessedMessageEntity }; // compatibility export
