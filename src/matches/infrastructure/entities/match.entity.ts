/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('matches')
export class MatchEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  @Index()
  tenantId!: string;

  @Column({
    name: 'external_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
  })
  externalId!: string | null;

  @Column({ name: 'home_team', type: 'varchar', length: 255 })
  homeTeam!: string;

  @Column({ name: 'away_team', type: 'varchar', length: 255 })
  awayTeam!: string;

  @Column({ type: 'varchar', length: 100 })
  sport!: string;

  @Column({ type: 'varchar', length: 100 })
  competition!: string;

  @Column({ type: 'jsonb' })
  participants!: any;

  @Column({ name: 'scheduled_start', type: 'timestamp with time zone' })
  @Index()
  scheduledStart!: Date;

  @Column({ type: 'varchar', length: 50, default: 'SCHEDULED' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ type: 'int', default: 1 })
  version!: number;
}
export { MatchEntity as default };
