export enum RiskDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface CouponLeg {
  adviceId: string;
  matchId: string;
  sport: string;
  competition: string;
  market: string;
  selection: string;
  decimalOdds: number;
  calibratedProbability: number;
  expectedValue: number;
}

export class CouponDraft {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly legs: CouponLeg[],
    public readonly combinedDecimalOdds: number,
    public readonly expectedValue: number,
    public readonly riskDecision: RiskDecision,
    public readonly rejectionReasons: string[] | null,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
  ) {}

  public static create(
    id: string,
    tenantId: string,
    legs: CouponLeg[],
    createdAt: Date,
    expiresAt: Date,
  ): CouponDraft {
    const rejectionReasons: string[] = [];

    if (legs.length === 0) {
      rejectionReasons.push('COUPON_EMPTY_LEGS');
    }
    if (legs.length > 5) {
      rejectionReasons.push('EXCEEDS_MAXIMUM_LEGS');
    }

    // Rule: Same-event dependencies and correlation (no multiple legs from the same match)
    const matchIds = legs.map((l) => l.matchId);
    const uniqueMatchIds = new Set(matchIds);
    if (uniqueMatchIds.size !== matchIds.length) {
      rejectionReasons.push('CORRELATED_LEGS_SAME_MATCH');
    }

    // Rule: Concentration limits (max 3 legs from the same sport or competition)
    const sports = legs.map((l) => l.sport);
    const competitions = legs.map((l) => l.competition);

    const sportCounts = sports.reduce(
      (acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const compCounts = competitions.reduce(
      (acc, c) => {
        acc[c] = (acc[c] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    if (Object.values(sportCounts).some((count) => count > 3)) {
      rejectionReasons.push('EXCESSIVE_SPORT_CONCENTRATION');
    }

    if (Object.values(compCounts).some((count) => count > 3)) {
      rejectionReasons.push('EXCESSIVE_COMPETITION_CONCENTRATION');
    }

    // Combined odds and combined EV calculations
    const combinedOdds = legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
    const avgEV =
      legs.reduce((acc, leg) => acc + leg.expectedValue, 0) /
      (legs.length || 1);

    const isRejected = rejectionReasons.length > 0;

    return new CouponDraft(
      id,
      tenantId,
      legs,
      Number.isFinite(combinedOdds) ? combinedOdds : 1.0,
      Number.isFinite(avgEV) ? avgEV : 0.0,
      isRejected ? RiskDecision.REJECTED : RiskDecision.APPROVED,
      isRejected ? rejectionReasons : null,
      createdAt,
      expiresAt,
    );
  }
}
