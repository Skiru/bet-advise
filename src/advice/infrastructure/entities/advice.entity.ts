import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MatchEntity } from '../../../matches/infrastructure/entities/match.entity';

@Entity('advice')
export class AdviceEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  matchId!: string;

  @ManyToOne(() => MatchEntity, (match) => match.advice, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'matchId' })
  match!: MatchEntity;

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
