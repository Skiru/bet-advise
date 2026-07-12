import { Match } from '../../matches/domain/match.entity';
import { MatchStatus } from '../../matches/domain/match-status.enum';
import { PredictionValue } from '../../analysis/domain/prediction-value';
import { OddsQuote } from '../../odds/domain/odds-quote.entity';

export enum AdviceDecision {
  RECOMMENDED = 'RECOMMENDED',
  REJECTED = 'REJECTED',
  ABSTAINED = 'ABSTAINED',
  EXPIRED = 'EXPIRED',
}

export class Advice {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly matchId: string,
    public readonly market: string,
    public readonly selection: string,
    public readonly decision: AdviceDecision,
    public readonly rejectionReason: string | null,
    public readonly expectedValue: number | null,
    public readonly edge: number | null,
    public readonly calibratedProbability: number | null,
    public readonly modelVersion: string | null,
    public readonly oddsQuoteId: string | null,
    public readonly rationale: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public static create(
    id: string,
    tenantId: string,
    matchId: string,
    market: string,
    selection: string,
    decision: AdviceDecision,
    rejectionReason: string | null,
    expectedValue: number | null,
    edge: number | null,
    calibratedProbability: number | null,
    modelVersion: string | null,
    oddsQuoteId: string | null,
    rationale: string,
  ): Advice {
    return new Advice(
      id,
      tenantId,
      matchId,
      market,
      selection,
      decision,
      rejectionReason,
      expectedValue,
      edge,
      calibratedProbability,
      modelVersion,
      oddsQuoteId,
      rationale,
      new Date(),
      new Date(),
    );
  }

  /**
   * Generates advice by evaluating incoming sports, prediction, and market odds data against strict conservative rules.
   */
  public static evaluate(params: {
    id: string;
    tenantId: string;
    match: { id: string; status: string } | null;
    prediction: PredictionValue | null;
    quote: OddsQuote | null;
    hasProvider: boolean;
    hasModel: boolean;
    market: string;
    selection: string;
  }): Advice {
    const {
      id,
      tenantId,
      match,
      prediction,
      quote,
      hasProvider,
      hasModel,
      market,
      selection,
    } = params;

    // Gate 1: Check provider configuration
    if (!hasProvider) {
      return Advice.create(
        id,
        tenantId,
        match?.id || 'unknown',
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'NO_PRODUCTION_DATA_PROVIDER',
        null,
        null,
        null,
        null,
        null,
        'Abstained: No production sports or odds data provider is configured.',
      );
    }

    // Gate 2: Check match eligibility
    if (!match) {
      return Advice.create(
        id,
        tenantId,
        'unknown',
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'INSUFFICIENT_VERIFIED_DATA',
        null,
        null,
        null,
        null,
        null,
        'Abstained: Target match was not found or verified.',
      );
    }

    if (match.status !== MatchStatus.SCHEDULED) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.REJECTED,
        'RISK_POLICY_REJECTED',
        null,
        null,
        null,
        null,
        null,
        `Rejected: Match status is ${match.status}; only SCHEDULED matches are eligible.`,
      );
    }

    // Gate 3: Check model approval
    if (!hasModel || !prediction) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'NO_APPROVED_MODEL',
        null,
        null,
        null,
        null,
        null,
        'Abstained: No approved analytical prediction model is active.',
      );
    }

    // Gate 4: Check valid odds quote
    if (!quote) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'NO_VALID_ODDS',
        null,
        null,
        null,
        prediction.rawModelProbability ? 'model_v1' : 'unknown',
        null,
        'Abstained: No valid odds quote available for this event.',
      );
    }

    if (quote.isSuspended) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'SUSPENDED_MARKET',
        null,
        null,
        null,
        prediction.rawModelProbability ? 'model_v1' : 'unknown',
        quote.id,
        'Abstained: Market is currently suspended.',
      );
    }

    if (quote.stale) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'STALE_ODDS',
        null,
        null,
        null,
        prediction.rawModelProbability ? 'model_v1' : 'unknown',
        quote.id,
        `Abstained: Odds quote is stale (${quote.staleReason || 'unknown'}).`,
      );
    }

    // Gate 5: Check Data Quality score
    if (prediction.dataQualityScore < 0.7) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'INSUFFICIENT_VERIFIED_DATA',
        null,
        null,
        null,
        'model_v1',
        quote.id,
        `Abstained: Data quality score (${prediction.dataQualityScore}) is below acceptable threshold.`,
      );
    }

    // Gate 6: Check Uncertainty (confidence / bounds)
    const uncertaintyRange =
      prediction.probabilityUpperBound - prediction.probabilityLowerBound;
    if (uncertaintyRange > 0.15) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.ABSTAINED,
        'UNCERTAINTY_TOO_HIGH',
        null,
        null,
        null,
        'model_v1',
        quote.id,
        `Abstained: Prediction uncertainty range (${uncertaintyRange.toFixed(3)}) is too high.`,
      );
    }

    // Gate 7: Calculate Edge and Expected Value (EV)
    const marketImplied = 1 / quote.decimalOdds;
    const edge = prediction.calibratedProbability - marketImplied;
    const ev = prediction.calibratedProbability * quote.decimalOdds - 1;

    if (edge < 0.03) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.REJECTED,
        'EDGE_BELOW_THRESHOLD',
        ev,
        edge,
        prediction.calibratedProbability,
        'model_v1',
        quote.id,
        `Rejected: Edge of ${(edge * 100).toFixed(2)}% is below conservative threshold of 3.00%.`,
      );
    }

    if (ev < 0.05) {
      return Advice.create(
        id,
        tenantId,
        match.id,
        market,
        selection,
        AdviceDecision.REJECTED,
        'EXPECTED_VALUE_BELOW_THRESHOLD',
        ev,
        edge,
        prediction.calibratedProbability,
        'model_v1',
        quote.id,
        `Rejected: Expected value of ${(ev * 100).toFixed(2)}% is below threshold of 5.00%.`,
      );
    }

    const evPct = (ev * 100).toFixed(2);
    const edgePct = (edge * 100).toFixed(2);
    const probPct = (prediction.calibratedProbability * 100).toFixed(2);

    return Advice.create(
      id,
      tenantId,
      match.id,
      market,
      selection,
      AdviceDecision.RECOMMENDED,
      null,
      ev,
      edge,
      prediction.calibratedProbability,
      'model_v1',
      quote.id,
      `Recommended: High-confidence advice generated with calibrated probability of ${probPct}%. Expected value: +${evPct}%, edge: +${edgePct}%. Odds: ${quote.decimalOdds.toFixed(2)}.`,
    );
  }
}
