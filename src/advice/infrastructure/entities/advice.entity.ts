import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('advice')
export class AdviceEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  @Index()
  tenantId!: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ type: 'varchar', length: 100 })
  market!: string;

  @Column({ type: 'varchar', length: 100 })
  selection!: string;

  @Column({ type: 'varchar', length: 50 })
  decision!: string;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  rejectionReason!: string | null;

  @Column({
    name: 'expected_value',
    type: 'numeric',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  expectedValue!: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  edge!: number | null;

  @Column({
    name: 'calibrated_probability',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  calibratedProbability!: number | null;

  @Column({
    name: 'model_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  modelVersion!: string | null;

  @Column({ name: 'odds_quote_id', type: 'uuid', nullable: true })
  oddsQuoteId!: string | null;

  @Column({ type: 'text' })
  rationale!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
