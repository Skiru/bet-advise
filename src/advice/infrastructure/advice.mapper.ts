import { Injectable } from '@nestjs/common';
import { AdviceEntity } from './entities/advice.entity';
import { Advice, AdviceDecision } from '../domain/advice.entity';

@Injectable()
export class AdviceMapper {
  toDomain(entity: AdviceEntity): Advice {
    return Advice.create(
      entity.id,
      entity.tenantId,
      entity.matchId,
      entity.market,
      entity.selection,
      entity.decision as AdviceDecision,
      entity.rejectionReason,
      entity.expectedValue ? Number(entity.expectedValue) : null,
      entity.edge ? Number(entity.edge) : null,
      entity.calibratedProbability
        ? Number(entity.calibratedProbability)
        : null,
      entity.modelVersion,
      entity.oddsQuoteId,
      entity.rationale,
    );
  }

  toEntity(domain: Advice): AdviceEntity {
    const entity = new AdviceEntity();
    entity.id = domain.id;
    entity.tenantId = domain.tenantId;
    entity.matchId = domain.matchId;
    entity.market = domain.market;
    entity.selection = domain.selection;
    entity.decision = domain.decision;
    entity.rejectionReason = domain.rejectionReason;
    entity.expectedValue = domain.expectedValue;
    entity.edge = domain.edge;
    entity.calibratedProbability = domain.calibratedProbability;
    entity.modelVersion = domain.modelVersion;
    entity.oddsQuoteId = domain.oddsQuoteId;
    entity.rationale = domain.rationale;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
export { AdviceMapper as default };
