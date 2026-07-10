import { Injectable } from '@nestjs/common';
import { MatchEntity } from './entities/match.entity';
import { Match } from '../domain/match.entity';
import { MatchStatus } from '../domain/match-status.enum';

@Injectable()
export class MatchMapper {
  toDomain(entity: MatchEntity): Match {
    return Match.create(
      entity.id,
      entity.tenantId,
      entity.homeTeam,
      entity.awayTeam,
      entity.kickoffAt,
      entity.status as MatchStatus,
      entity.createdAt,
      entity.updatedAt,
      entity.externalId,
    );
  }

  toEntity(domain: Match): MatchEntity {
    const entity = new MatchEntity();
    entity.id = domain.id;
    entity.tenantId = domain.tenantId;
    entity.homeTeam = domain.homeTeam;
    entity.awayTeam = domain.awayTeam;
    entity.kickoffAt = domain.kickoffAt;
    entity.status = domain.status;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.externalId = domain.externalId;
    return entity;
  }
}
