import { Match } from '../../../matches/domain/match.entity';

export interface SportsDataProviderPort {
  fetchMatches(sport: string): Promise<Match[]>;
}

export const SportsDataProviderPortToken = Symbol('SportsDataProviderPort');
