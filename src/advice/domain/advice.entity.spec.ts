import { Advice, AdviceDecision } from './advice.entity';
import { Match } from '../../matches/domain/match.entity';
import { MatchStatus } from '../../matches/domain/match-status.enum';
import { PredictionValue } from '../../analysis/domain/prediction-value';
import { OddsQuote } from '../../odds/domain/odds-quote.entity';

describe('Advice Domain Entity', () => {
  const tenantId = 'tenant-123';
  const matchId = 'match-456';
  const market = 'match_winner';
  const selection = 'home';

  const validMatch = Match.create(
    matchId,
    tenantId,
    'Home Team',
    'Away Team',
    new Date(Date.now() + 100000),
    MatchStatus.SCHEDULED,
    new Date(),
    new Date(),
  );

  const validPrediction = new PredictionValue(
    0.6, // rawModelProbability
    0.58, // calibratedProbability
    0.5, // marketImpliedProbability
    0.5, // noVigMarketProbability
    0.55, // probabilityLowerBound
    0.61, // probabilityUpperBound
    0.9, // modelConfidence
    0.95, // dataQualityScore
  );

  const validQuote = OddsQuote.create(
    'quote-123',
    tenantId,
    'provider-1',
    'bookmaker-1',
    matchId,
    market,
    selection,
    1.9,
    new Date(Date.now() - 5000),
    new Date(Date.now() - 1000),
    false,
    false,
    null,
  );

  it('should recommend advice when all conservative gates are satisfied', () => {
    const advice = Advice.evaluate({
      id: 'advice-123',
      tenantId,
      match: validMatch,
      prediction: validPrediction,
      quote: validQuote,
      hasProvider: true,
      hasModel: true,
      market,
      selection,
    });

    console.log(
      'DEBUG RECOMMENDED DECISION:',
      advice.decision,
      'REASON:',
      advice.rejectionReason,
    );

    expect(advice.decision).toBe(AdviceDecision.RECOMMENDED);
    expect(advice.expectedValue).toBeCloseTo(0.102, 4);
    expect(advice.edge).toBeCloseTo(0.0537, 3);
    expect(advice.rejectionReason).toBeNull();
  });

  it('should reject when edge is below conservative threshold', () => {
    const lowPrediction = new PredictionValue(
      0.55,
      0.54,
      0.5,
      0.5,
      0.51,
      0.57,
      0.9,
      0.95,
    );

    const advice = Advice.evaluate({
      id: 'advice-123',
      tenantId,
      match: validMatch,
      prediction: lowPrediction,
      quote: validQuote,
      hasProvider: true,
      hasModel: true,
      market,
      selection,
    });

    console.log(
      'DEBUG REJECTED DECISION:',
      advice.decision,
      'REASON:',
      advice.rejectionReason,
    );

    expect(advice.decision).toBe(AdviceDecision.REJECTED);
    expect(advice.rejectionReason).toBe('EDGE_BELOW_THRESHOLD');
  });
});
