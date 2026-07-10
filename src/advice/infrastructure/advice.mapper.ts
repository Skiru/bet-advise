import { Injectable } from '@nestjs/common';
import { AdviceEntity } from './entities/advice.entity';
import { Advice } from '../domain/advice.entity';
import { AdviceStatus } from '../domain/advice-status.enum';

@Injectable()
export class AdviceMapper {
  toDomain(entity: AdviceEntity): Advice {
    return Advice.create(
      entity.id,
      entity.tenantId,
      entity.matchId,
      entity.market,
      entity.selection,
      entity.confidence,
      entity.rationale,
      entity.status as AdviceStatus,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  toEntity(domain: Advice): AdviceEntity {
    const entity = new AdviceEntity();
    entity.id = domain.id;
    entity.tenantId = domain.tenantId;
    entity.matchId = domain.matchId;
    entity.market = domain.market;
    entity.selection = domain.selection;
    entity.confidence = domain.confidence;
    entity.rationale = domain.rationale;
    entity.status = domain.status;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
