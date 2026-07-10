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
  @PrimaryColumn()
  id!: string;

  @Column({
    name: 'tenant_id',
    type: 'varchar',
    length: 50,
    default: 'default',
  })
  @Index()
  tenantId!: string;

  @Column()
  matchId!: string;

  @Column()
  market!: string;

  @Column()
  selection!: string;

  @Column()
  confidence!: number;

  @Column({ type: 'text' })
  rationale!: string;

  @Column({ default: 'DRAFT' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
