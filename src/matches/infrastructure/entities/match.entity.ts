import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('matches')
export class MatchEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  externalId!: string | null;

  @Column()
  homeTeam!: string;

  @Column()
  awayTeam!: string;

  @Column({ type: 'timestamp with time zone' })
  kickoffAt!: Date;

  @Column({ default: 'SCHEDULED' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
