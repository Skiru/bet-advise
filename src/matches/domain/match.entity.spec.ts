import { Match } from './match.entity';
import { MatchStatus } from './match-status.enum';

describe('Match Domain Entity', () => {
  it('should correctly instantiate a match using constructor', () => {
    const id = 'match-123';
    const homeTeam = 'Arsenal';
    const awayTeam = 'Chelsea';
    const kickoffAt = new Date();
    const status = MatchStatus.SCHEDULED;
    const createdAt = new Date();
    const updatedAt = new Date();
    const externalId = 'ext-123';

    const match = new Match(
      id,
      'default',
      homeTeam,
      awayTeam,
      kickoffAt,
      status,
      createdAt,
      updatedAt,
      externalId,
    );

    expect(match.id).toBe(id);
    expect(match.homeTeam).toBe(homeTeam);
    expect(match.awayTeam).toBe(awayTeam);
    expect(match.kickoffAt).toBe(kickoffAt);
    expect(match.status).toBe(status);
    expect(match.createdAt).toBe(createdAt);
    expect(match.updatedAt).toBe(updatedAt);
    expect(match.externalId).toBe(externalId);
  });

  it('should correctly instantiate a match using create factory method', () => {
    const id = 'match-456';
    const homeTeam = 'Real Madrid';
    const awayTeam = 'Barcelona';
    const kickoffAt = new Date();
    const status = MatchStatus.LIVE;
    const createdAt = new Date();
    const updatedAt = new Date();

    const match = Match.create(
      id,
      'default',
      homeTeam,
      awayTeam,
      kickoffAt,
      status,
      createdAt,
      updatedAt,
    );

    expect(match.id).toBe(id);
    expect(match.homeTeam).toBe(homeTeam);
    expect(match.awayTeam).toBe(awayTeam);
    expect(match.kickoffAt).toBe(kickoffAt);
    expect(match.status).toBe(status);
    expect(match.createdAt).toBe(createdAt);
    expect(match.updatedAt).toBe(updatedAt);
    expect(match.externalId).toBeNull();
  });
});
