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
    public readonly sport: string = 'soccer',
    public readonly competition: string = 'default-league',
    public readonly participants: string[] = [],
    public readonly version: number = 1,
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
    sport = 'soccer',
    competition = 'default-league',
    participants: string[] = [],
    version = 1,
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
      sport,
      competition,
      participants,
      version,
    );
  }

  public transitionTo(newStatus: MatchStatus): Match {
    const allowed: Record<MatchStatus, MatchStatus[]> = {
      [MatchStatus.SCHEDULED]: [
        MatchStatus.LIVE,
        MatchStatus.POSTPONED,
        MatchStatus.CANCELLED,
      ],
      [MatchStatus.POSTPONED]: [MatchStatus.SCHEDULED, MatchStatus.CANCELLED],
      [MatchStatus.LIVE]: [MatchStatus.FINISHED, MatchStatus.ABANDONED],
      [MatchStatus.FINISHED]: [],
      [MatchStatus.CANCELLED]: [],
      [MatchStatus.ABANDONED]: [],
    };

    const targets = allowed[this.status] || [];
    if (!targets.includes(newStatus)) {
      throw new Error(
        `Invalid match status transition from ${this.status} to ${newStatus}`,
      );
    }

    return new Match(
      this.id,
      this.tenantId,
      this.homeTeam,
      this.awayTeam,
      this.kickoffAt,
      newStatus,
      this.createdAt,
      new Date(),
      this.externalId,
      this.sport,
      this.competition,
      this.participants,
      this.version + 1,
    );
  }
}
