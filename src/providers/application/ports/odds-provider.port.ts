import { OddsEntity } from '../../../odds/infrastructure/entities/odds.entity';

export interface OddsProviderPort {
  fetchOdds(eventId: string): Promise<OddsEntity[]>;
}

export const OddsProviderPortToken = Symbol('OddsProviderPort');
