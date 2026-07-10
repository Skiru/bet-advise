import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetAdviceQuery } from '../queries/get-advice.query';
import { ADVICE_REPOSITORY_PORT } from '../ports/advice-repository.port';
import type { IAdviceRepository } from '../ports/advice-repository.port';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';

@QueryHandler(GetAdviceQuery)
export class GetAdviceHandler implements IQueryHandler<GetAdviceQuery> {
  constructor(
    @Inject(ADVICE_REPOSITORY_PORT)
    private readonly repository: IAdviceRepository,
  ) {}

  async execute(query: GetAdviceQuery) {
    const advice = await this.repository.findById(query.id);
    if (!advice) {
      throw new NotFoundDomainError('Advice', query.id);
    }
    return advice;
  }
}
