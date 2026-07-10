import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('outbox_events')
@Index(['status', 'createdAt'])
@Index(['aggregateType', 'aggregateId'])
@Index(['tenantId'])
export class OutboxEventEntity {
  @PrimaryColumn()
  id!: string;

  @Column({
    name: 'tenant_id',
    type: 'varchar',
    length: 50,
    default: 'default',
  })
  tenantId!: string;

  @Column()
  type!: string;

  @Column()
  aggregateType!: string;

  @Column()
  aggregateId!: string;

  @Column({ type: 'jsonb' })
  payload!: any;

  @Column({ default: 'PENDING' })
  status!: string;

  @Column({ default: 0 })
  attemptCount!: number;

  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
