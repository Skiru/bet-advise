import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetMatchQuery } from '../queries/get-match.query';
import { MATCH_REPOSITORY_PORT } from '../ports/match-repository.port';
import type { IMatchRepository } from '../ports/match-repository.port';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';

@QueryHandler(GetMatchQuery)
export class GetMatchHandler implements IQueryHandler<GetMatchQuery> {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT)
    private readonly repository: IMatchRepository,
  ) {}

  async execute(query: GetMatchQuery) {
    const match = await this.repository.findById(query.id);
    if (!match) {
      throw new NotFoundDomainError('Match', query.id);
    }
    return match;
  }
}
