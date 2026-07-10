import { Injectable } from '@nestjs/common';
import { ApiTokenEntity } from './entities/api-token.entity';
import { ApiToken } from '../domain/api-token.entity';

@Injectable()
export class ApiTokenMapper {
  toDomain(entity: ApiTokenEntity): ApiToken {
    return new ApiToken(
      entity.token,
      entity.tenantId,
      entity.externalId,
      entity.preferredBookmaker,
      entity.externalIntegrationId,
      entity.activeBookmaker,
      entity.deviceId,
      entity.expiresAt,
      entity.oneSignalSubscriptionId,
      entity.deviceDetails,
    );
  }

  toEntity(domain: ApiToken): ApiTokenEntity {
    const entity = new ApiTokenEntity();
    entity.token = domain.token;
    entity.tenantId = domain.tenantId;
    entity.externalId = domain.externalId;
    entity.preferredBookmaker = domain.preferredBookmaker;
    entity.externalIntegrationId = domain.externalIntegrationId;
    entity.activeBookmaker = domain.activeBookmaker;
    entity.oneSignalSubscriptionId = domain.oneSignalSubscriptionId;
    entity.deviceId = domain.deviceId;
    entity.deviceDetails = domain.deviceDetails;
    entity.expiresAt = domain.expiresAt;
    return entity;
  }
}
