import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('odds')
@Index(['tenantId', 'eventId', 'marketId'])
export class OddsEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 100 })
  providerId!: string;

  @Column({ name: 'bookmaker_id', type: 'varchar', length: 100 })
  bookmakerId!: string;

  @Column({ name: 'event_id', type: 'varchar', length: 255 })
  eventId!: string;

  @Column({ name: 'market_id', type: 'varchar', length: 100 })
  marketId!: string;

  @Column({ name: 'outcome_id', type: 'varchar', length: 100 })
  outcomeId!: string;

  @Column({ name: 'decimal_odds', type: 'numeric', precision: 10, scale: 4 })
  decimalOdds!: number;

  @Column({ name: 'captured_at', type: 'timestamp with time zone' })
  capturedAt!: Date;

  @Column({ name: 'received_at', type: 'timestamp with time zone' })
  receivedAt!: Date;

  @Column({ name: 'is_suspended', type: 'boolean', default: false })
  isSuspended!: boolean;

  @Column({ type: 'boolean', default: false })
  stale!: boolean;

  @Column({
    name: 'stale_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  staleReason!: string | null;
}
