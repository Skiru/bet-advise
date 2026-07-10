import { Advice } from './advice.entity';
import { AdviceStatus } from './advice-status.enum';

describe('Advice Domain Entity', () => {
  it('should correctly instantiate an advice using constructor', () => {
    const id = 'advice-123';
    const matchId = 'match-123';
    const market = 'match_winner';
    const selection = 'home_or_draw';
    const confidence = 85;
    const rationale = 'Strong home team form';
    const status = AdviceStatus.GENERATED;
    const createdAt = new Date();
    const updatedAt = new Date();

    const advice = new Advice(
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

    expect(advice.id).toBe(id);
    expect(advice.matchId).toBe(matchId);
    expect(advice.market).toBe(market);
    expect(advice.selection).toBe(selection);
    expect(advice.confidence).toBe(confidence);
    expect(advice.rationale).toBe(rationale);
    expect(advice.status).toBe(status);
    expect(advice.createdAt).toBe(createdAt);
    expect(advice.updatedAt).toBe(updatedAt);
  });

  it('should correctly instantiate an advice using create factory method', () => {
    const id = 'advice-456';
    const matchId = 'match-456';
    const market = 'both_teams_to_score';
    const selection = 'yes';
    const confidence = 70;
    const rationale = 'High-scoring matches history';
    const status = AdviceStatus.APPROVED;
    const createdAt = new Date();
    const updatedAt = new Date();

    const advice = Advice.create(
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

    expect(advice.id).toBe(id);
    expect(advice.matchId).toBe(matchId);
    expect(advice.market).toBe(market);
    expect(advice.selection).toBe(selection);
    expect(advice.confidence).toBe(confidence);
    expect(advice.rationale).toBe(rationale);
    expect(advice.status).toBe(status);
    expect(advice.createdAt).toBe(createdAt);
    expect(advice.updatedAt).toBe(updatedAt);
  });
});
