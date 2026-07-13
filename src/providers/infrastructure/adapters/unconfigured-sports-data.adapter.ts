import { SportsDataProviderPort } from '../../application/ports/sports-data-provider.port';
import { Match } from '../../../matches/domain/match.entity';
import { ProviderNotConfiguredError } from '../../../shared/domain/domain-error';

export class UnconfiguredSportsDataProvider implements SportsDataProviderPort {
  async fetchMatches(sport: string): Promise<Match[]> {
    throw new ProviderNotConfiguredError(`Sports data provider for ${sport}`);
  }
}
