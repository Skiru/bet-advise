import { Advice } from '../../domain/advice.entity';

export interface IAdviceRepository {
  findById(id: string): Promise<Advice | null>;
  findByMatchId(matchId: string): Promise<Advice[]>;
  findAll(): Promise<Advice[]>;
  createWithOutbox(data: {
    id: string;
    tenantId: string;
    matchId: string;
    market: string;
    selection: string;
    decision: string;
    rejectionReason: string | null;
    expectedValue: number | null;
    edge: number | null;
    calibratedProbability: number | null;
    modelVersion: string | null;
    oddsQuoteId: string | null;
    rationale: string;
  }): Promise<Advice>;
}

export const ADVICE_REPOSITORY_PORT = Symbol('IAdviceRepository');
