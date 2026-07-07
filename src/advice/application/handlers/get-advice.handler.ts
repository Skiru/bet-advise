import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAdviceQuery } from '../queries/get-advice.query';
import { TypeOrmAdviceRepository } from '../../infrastructure/typeorm-advice.repository';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';

@QueryHandler(GetAdviceQuery)
export class GetAdviceHandler implements IQueryHandler<GetAdviceQuery> {
  constructor(private readonly repository: TypeOrmAdviceRepository) {}

  async execute(query: GetAdviceQuery) {
    const advice = await this.repository.findById(query.id);
    if (!advice) {
      throw new NotFoundDomainError('Advice', query.id);
    }
    return advice;
  }
}
