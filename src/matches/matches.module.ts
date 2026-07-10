import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchEntity } from './infrastructure/entities/match.entity';
import { TypeOrmMatchRepository } from './infrastructure/typeorm-match.repository';
import { MATCH_REPOSITORY_PORT } from './application/ports/match-repository.port';
import { CreateMatchHandler } from './application/handlers/create-match.handler';
import { GetMatchHandler } from './application/handlers/get-match.handler';
import { ListMatchesHandler } from './application/handlers/list-matches.handler';
import { MatchesController } from './interfaces/http/matches.controller';
import { MATCHES_MODULE_API } from './interfaces/module-api/matches-module.api.interface';
import { MatchesModuleApi } from './interfaces/module-api/matches-module.api';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([MatchEntity])],
  controllers: [MatchesController],
  providers: [
    {
      provide: MATCH_REPOSITORY_PORT,
      useClass: TypeOrmMatchRepository,
    },
    {
      provide: MATCHES_MODULE_API,
      useClass: MatchesModuleApi,
    },
    CreateMatchHandler,
    GetMatchHandler,
    ListMatchesHandler,
  ],
  exports: [MATCH_REPOSITORY_PORT, MATCHES_MODULE_API],
})
export class MatchesModule {}
