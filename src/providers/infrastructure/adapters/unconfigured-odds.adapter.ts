import { OddsProviderPort } from '../../application/ports/odds-provider.port';
import { OddsEntity } from '../../../odds/infrastructure/entities/odds.entity';
import { ProviderNotConfiguredError } from '../../../shared/domain/domain-error';

export class UnconfiguredOddsProvider implements OddsProviderPort {
  async fetchOdds(eventId: string): Promise<OddsEntity[]> {
    throw new ProviderNotConfiguredError(
      `Odds data provider for event ${eventId}`,
    );
  }
}
