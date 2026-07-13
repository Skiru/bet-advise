/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('analysis_runs')
export class AnalysisRunEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ name: 'cutoff_at', type: 'timestamp with time zone' })
  cutoffAt!: Date;

  @Column({ type: 'jsonb' })
  features!: any;

  @Column({ type: 'jsonb' })
  predictions!: any;

  @Column({
    name: 'data_quality_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
  })
  dataQualityScore!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
