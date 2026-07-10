import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_tokens')
export class ApiTokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  token!: string;

  @Column({
    name: 'tenant_id',
    type: 'varchar',
    length: 50,
    default: 'default',
  })
  @Index()
  tenantId!: string;

  @Index()
  @Column({ name: 'external_id' })
  externalId!: string;

  @Column({ name: 'preferred_bookmaker' })
  preferredBookmaker!: string;

  @Column({ name: 'external_integration_id' })
  externalIntegrationId!: string;

  @Column({ name: 'active_bookmaker' })
  activeBookmaker!: string;

  @Column({
    name: 'one_signal_subscription_id',
    type: 'varchar',
    nullable: true,
  })
  oneSignalSubscriptionId!: string | null;

  @Column({ name: 'device_id' })
  deviceId!: string;

  @Column({ name: 'device_details', type: 'text', nullable: true })
  deviceDetails!: string | null;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
