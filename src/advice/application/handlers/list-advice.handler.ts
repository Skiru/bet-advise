import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListAdviceQuery } from '../queries/list-advice.query';
import { ADVICE_REPOSITORY_PORT } from '../ports/advice-repository.port';
import type { IAdviceRepository } from '../ports/advice-repository.port';

@QueryHandler(ListAdviceQuery)
export class ListAdviceHandler implements IQueryHandler<ListAdviceQuery> {
  constructor(
    @Inject(ADVICE_REPOSITORY_PORT)
    private readonly repository: IAdviceRepository,
  ) {}

  async execute(query: ListAdviceQuery) {
    if (query.matchId) {
      return this.repository.findByMatchId(query.matchId);
    }
    return this.repository.findAll();
  }
}
