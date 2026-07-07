import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchEntity } from './infrastructure/entities/match.entity';
import { TypeOrmMatchRepository } from './infrastructure/typeorm-match.repository';
import { CreateMatchHandler } from './application/handlers/create-match.handler';
import { GetMatchHandler } from './application/handlers/get-match.handler';
import { ListMatchesHandler } from './application/handlers/list-matches.handler';
import { MatchesController } from './interfaces/http/matches.controller';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([MatchEntity])],
  controllers: [MatchesController],
  providers: [
    TypeOrmMatchRepository,
    CreateMatchHandler,
    GetMatchHandler,
    ListMatchesHandler,
  ],
  exports: [TypeOrmMatchRepository],
})
export class MatchesModule {}
