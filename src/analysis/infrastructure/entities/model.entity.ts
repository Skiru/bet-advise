/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('models')
export class ModelEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  version!: string;

  @Column({ name: 'commit_sha', type: 'varchar', length: 100 })
  commitSha!: string;

  @Column({ type: 'jsonb' })
  hyperparameters!: any;

  @Column({ name: 'approval_status', type: 'varchar', length: 50 })
  approvalStatus!: string;

  @Column({
    name: 'approved_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  approvedAt!: Date | null;

  @Column({ name: 'approved_by', type: 'varchar', length: 255, nullable: true })
  approvedBy!: string | null;
}
