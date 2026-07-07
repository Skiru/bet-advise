import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { ListAdviceQuery } from '../queries/list-advice.query';
import { TypeOrmAdviceRepository } from '../../infrastructure/typeorm-advice.repository';

@QueryHandler(ListAdviceQuery)
export class ListAdviceHandler implements IQueryHandler<ListAdviceQuery> {
  constructor(private readonly repository: TypeOrmAdviceRepository) {}

  async execute(query: ListAdviceQuery) {
    if (query.matchId) {
      return this.repository.findByMatchId(query.matchId);
    }
    return this.repository.findAll();
  }
}
