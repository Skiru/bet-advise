import { MatchStatus } from './match-status.enum';

export class Match {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly homeTeam: string,
    public readonly awayTeam: string,
    public readonly kickoffAt: Date,
    public readonly status: MatchStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly externalId: string | null = null,
  ) {}

  public static create(
    id: string,
    tenantId: string,
    homeTeam: string,
    awayTeam: string,
    kickoffAt: Date,
    status: MatchStatus,
    createdAt: Date,
    updatedAt: Date,
    externalId: string | null = null,
  ): Match {
    return new Match(
      id,
      tenantId,
      homeTeam,
      awayTeam,
      kickoffAt,
      status,
      createdAt,
      updatedAt,
      externalId,
    );
  }
}
