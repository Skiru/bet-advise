import { Injectable } from '@nestjs/common';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { RefreshToken } from '../domain/refresh-token.entity';

@Injectable()
export class RefreshTokenMapper {
  toDomain(entity: RefreshTokenEntity): RefreshToken {
    return new RefreshToken(
      entity.id,
      entity.tenantId,
      entity.externalId,
      entity.preferredBookmaker,
      entity.externalIntegrationId,
      entity.activeBookmaker,
      entity.deviceId,
      entity.salt,
      entity.tokenHash,
      entity.issuedAt,
      entity.expiresAt,
      entity.deviceDetails,
      entity.oneSignalSubscriptionId,
      entity.revokedAt,
      entity.revokedReason,
      entity.lastUsedAt,
      entity.userAgent,
      entity.ipAddress,
    );
  }

  toEntity(domain: RefreshToken): RefreshTokenEntity {
    const entity = new RefreshTokenEntity();
    entity.id = domain.id;
    entity.tenantId = domain.tenantId;
    entity.externalId = domain.externalId;
    entity.preferredBookmaker = domain.preferredBookmaker;
    entity.externalIntegrationId = domain.externalIntegrationId;
    entity.activeBookmaker = domain.activeBookmaker;
    entity.deviceId = domain.deviceId;
    entity.deviceDetails = domain.deviceDetails;
    entity.oneSignalSubscriptionId = domain.oneSignalSubscriptionId;
    entity.tokenHash = domain.tokenHash;
    entity.salt = domain.salt;
    entity.issuedAt = domain.issuedAt;
    entity.expiresAt = domain.expiresAt;
    entity.revokedAt = domain.revokedAt;
    entity.revokedReason = domain.revokedReason;
    entity.lastUsedAt = domain.lastUsedAt;
    entity.userAgent = domain.userAgent;
    entity.ipAddress = domain.ipAddress;
    return entity;
  }
}
