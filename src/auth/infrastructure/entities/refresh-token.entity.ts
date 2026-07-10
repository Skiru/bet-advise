import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'external_id' })
  externalId!: string;

  @Column({ name: 'preferred_bookmaker' })
  preferredBookmaker!: string;

  @Column({ name: 'external_integration_id' })
  externalIntegrationId!: string;

  @Column({ name: 'active_bookmaker' })
  activeBookmaker!: string;

  @Column({ name: 'device_id' })
  deviceId!: string;

  @Column({ name: 'device_details', type: 'text', nullable: true })
  deviceDetails!: string | null;

  @Column({
    name: 'one_signal_subscription_id',
    type: 'varchar',
    nullable: true,
  })
  oneSignalSubscriptionId!: string | null;

  @Column({ name: 'token_hash', type: 'varchar', unique: true })
  tokenHash!: string;

  @Column()
  salt!: string;

  @Column({ name: 'issued_at', type: 'timestamp with time zone' })
  issuedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @Column({
    name: 'revoked_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_reason', type: 'varchar', nullable: true })
  revokedReason!: string | null;

  @Column({
    name: 'last_used_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastUsedAt!: Date | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
