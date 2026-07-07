import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetMatchQuery } from '../queries/get-match.query';
import { TypeOrmMatchRepository } from '../../infrastructure/typeorm-match.repository';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';

@QueryHandler(GetMatchQuery)
export class GetMatchHandler implements IQueryHandler<GetMatchQuery> {
  constructor(private readonly repository: TypeOrmMatchRepository) {}

  async execute(query: GetMatchQuery) {
    const match = await this.repository.findById(query.id);
    if (!match) {
      throw new NotFoundDomainError('Match', query.id);
    }
    return match;
  }
}
