import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListMatchesQuery } from '../queries/list-matches.query';
import { MATCH_REPOSITORY_PORT } from '../ports/match-repository.port';
import type { IMatchRepository } from '../ports/match-repository.port';

@QueryHandler(ListMatchesQuery)
export class ListMatchesHandler implements IQueryHandler<ListMatchesQuery> {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT)
    private readonly repository: IMatchRepository,
  ) {}

  async execute() {
    return this.repository.findAll();
  }
}
