import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('advice')
export class AdviceEntity {
  @PrimaryColumn()
  id!: string;

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
