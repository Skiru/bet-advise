/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('outbox_events')
@Index(['status', 'nextAttemptAt'])
export class OutboxEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  @Index()
  tenantId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  type!: string;

  @Column({ name: 'schema_version', type: 'varchar', length: 50 })
  schemaVersion!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 100 })
  aggregateType!: string;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 100 })
  aggregateId!: string;

  @Column({ type: 'jsonb' })
  payload!: any;

  @Column({ name: 'payload_checksum', type: 'varchar', length: 100 })
  payloadChecksum!: string;

  @Column({ name: 'correlation_id', type: 'varchar', length: 100 })
  correlationId!: string;

  @Column({ name: 'causation_id', type: 'varchar', length: 100 })
  causationId!: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: string;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ name: 'next_attempt_at', type: 'timestamp with time zone' })
  nextAttemptAt!: Date;

  @Column({ name: 'claim_owner', type: 'varchar', length: 255, nullable: true })
  claimOwner!: string | null;

  @Column({
    name: 'claimed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  claimedAt!: Date | null;

  @Column({
    name: 'lease_until',
    type: 'timestamp with time zone',
    nullable: true,
  })
  leaseUntil!: Date | null;

  @Column({
    name: 'published_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  publishedAt!: Date | null;

  @Column({
    name: 'last_error_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastErrorCode!: string | null;

  @Column({ name: 'last_error_summary', type: 'text', nullable: true })
  lastErrorSummary!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
