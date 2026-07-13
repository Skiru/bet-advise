import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderEntity } from './infrastructure/entities/provider.entity';
import { ProviderRegistry } from './infrastructure/provider.registry';
import { SportsDataProviderPortToken } from './application/ports/sports-data-provider.port';
import { OddsProviderPortToken } from './application/ports/odds-provider.port';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProviderEntity])],
  providers: [
    ProviderRegistry,
    {
      provide: SportsDataProviderPortToken,
      useFactory: (registry: ProviderRegistry) => registry.getSportsProvider(),
      inject: [ProviderRegistry],
    },
    {
      provide: OddsProviderPortToken,
      useFactory: (registry: ProviderRegistry) => registry.getOddsProvider(),
      inject: [ProviderRegistry],
    },
  ],
  exports: [
    ProviderRegistry,
    SportsDataProviderPortToken,
    OddsProviderPortToken,
  ],
})
export class ProvidersModule {}
