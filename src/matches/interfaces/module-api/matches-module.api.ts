import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { IMatchesModuleApi } from './matches-module.api.interface';
import { MatchContractDto } from './dto/match-contract.dto';
import { GetMatchQuery } from '../../application/queries/get-match.query';
import { Match } from '../../domain/match.entity';

@Injectable()
export class MatchesModuleApi implements IMatchesModuleApi {
  constructor(private readonly queryBus: QueryBus) {}

  async findById(id: string): Promise<MatchContractDto | null> {
    try {
      const match = await this.queryBus.execute<GetMatchQuery, Match | null>(
        new GetMatchQuery(id),
      );
      if (!match) return null;
      return new MatchContractDto(
        match.id,
        match.homeTeam,
        match.awayTeam,
        match.kickoffAt,
        match.status,
        match.externalId,
      );
    } catch {
      return null;
    }
  }
}
