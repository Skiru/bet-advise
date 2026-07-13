import { Injectable } from '@nestjs/common';
import { SportsDataProviderPort } from '../application/ports/sports-data-provider.port';
import { OddsProviderPort } from '../application/ports/odds-provider.port';
import { UnconfiguredSportsDataProvider } from './adapters/unconfigured-sports-data.adapter';
import { UnconfiguredOddsProvider } from './adapters/unconfigured-odds.adapter';

@Injectable()
export class ProviderRegistry {
  private sportsProvider: SportsDataProviderPort =
    new UnconfiguredSportsDataProvider();
  private oddsProvider: OddsProviderPort = new UnconfiguredOddsProvider();

  public getSportsProvider(): SportsDataProviderPort {
    return this.sportsProvider;
  }

  public getOddsProvider(): OddsProviderPort {
    return this.oddsProvider;
  }

  public registerSportsProvider(provider: SportsDataProviderPort): void {
    this.sportsProvider = provider;
  }

  public registerOddsProvider(provider: OddsProviderPort): void {
    this.oddsProvider = provider;
  }
}
