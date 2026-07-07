/* eslint-disable */
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
export class AuditLogEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  actor!: string | null;

  @Column()
  action!: string;

  @Column()
  entityType!: string;

  @Column()
  entityId!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: any | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
