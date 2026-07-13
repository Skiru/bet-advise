/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('coupon_drafts')
export class CouponDraftEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ type: 'jsonb' })
  legs!: any;

  @Column({ name: 'combined_odds', type: 'numeric', precision: 10, scale: 4 })
  combinedOdds!: number;

  @Column({ name: 'expected_value', type: 'numeric', precision: 10, scale: 4 })
  expectedValue!: number;

  @Column({ name: 'risk_decision', type: 'varchar', length: 50 })
  riskDecision!: string;

  @Column({ name: 'rejection_reasons', type: 'jsonb', nullable: true })
  rejectionReasons!: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;
}
