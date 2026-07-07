import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { ListMatchesQuery } from '../queries/list-matches.query';
import { TypeOrmMatchRepository } from '../../infrastructure/typeorm-match.repository';

@QueryHandler(ListMatchesQuery)
export class ListMatchesHandler implements IQueryHandler<ListMatchesQuery> {
  constructor(private readonly repository: TypeOrmMatchRepository) {}

  async execute() {
    return this.repository.findAll();
  }
}
