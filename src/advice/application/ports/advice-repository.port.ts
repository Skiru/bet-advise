import { Advice } from '../../domain/advice.entity';

export interface IAdviceRepository {
  findById(id: string): Promise<Advice | null>;
  findByMatchId(matchId: string): Promise<Advice[]>;
  findAll(): Promise<Advice[]>;
  createWithOutbox(data: {
    matchId: string;
    market: string;
    selection: string;
    confidence: number;
    rationale: string;
  }): Promise<Advice>;
}

export const ADVICE_REPOSITORY_PORT = Symbol('IAdviceRepository');
