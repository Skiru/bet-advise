/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['action'])
@Index(['createdAt'])
@Index(['tenantId'])
export class AuditLogEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actor!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'entity_name', type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  entityId!: string;

  @Column({ type: 'jsonb' })
  payload!: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
