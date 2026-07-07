import { AdviceStatus } from './advice-status.enum';

export class Advice {
  constructor(
    public readonly id: string,
    public readonly matchId: string,
    public readonly market: string,
    public readonly selection: string,
    public readonly confidence: number,
    public readonly rationale: string,
    public readonly status: AdviceStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public static create(
    id: string,
    matchId: string,
    market: string,
    selection: string,
    confidence: number,
    rationale: string,
    status: AdviceStatus,
    createdAt: Date,
    updatedAt: Date,
  ): Advice {
    return new Advice(
      id,
      matchId,
      market,
      selection,
      confidence,
      rationale,
      status,
      createdAt,
      updatedAt,
    );
  }
}
