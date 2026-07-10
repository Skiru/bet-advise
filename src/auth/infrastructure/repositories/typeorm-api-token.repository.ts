import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTokenRepositoryPort } from '../../application/ports/api-token-repository.port';
import { ApiTokenEntity } from '../entities/api-token.entity';
import { ApiToken } from '../../domain/api-token.entity';

@Injectable()
export class TypeOrmApiTokenRepository implements ApiTokenRepositoryPort {
  constructor(
    @InjectRepository(ApiTokenEntity)
    private readonly repo: Repository<ApiTokenEntity>,
  ) {}

  private mapToDomain(entity: ApiTokenEntity): ApiToken {
    return new ApiToken(
      entity.token,
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

  private mapToEntity(domain: ApiToken): ApiTokenEntity {
    const entity = new ApiTokenEntity();
    entity.token = domain.token;
    entity.externalId = domain.externalId;
    entity.preferredBookmaker = domain.preferredBookmaker;
    entity.externalIntegrationId = domain.externalIntegrationId;
    entity.activeBookmaker = domain.activeBookmaker;
    entity.deviceId = domain.deviceId;
    entity.expiresAt = domain.expiresAt;
    entity.oneSignalSubscriptionId = domain.oneSignalSubscriptionId;
    entity.deviceDetails = domain.deviceDetails;
    return entity;
  }

  async save(token: ApiToken): Promise<void> {
    const entity = this.mapToEntity(token);
    await this.repo.save(entity);
  }

  async findByExternalId(externalId: string): Promise<ApiToken | null> {
    const entity = await this.repo.findOne({ where: { externalId } });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async findByToken(token: string): Promise<ApiToken | null> {
    const entity = await this.repo.findOne({ where: { token } });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async deleteByExternalId(externalId: string): Promise<void> {
    await this.repo.delete({ externalId });
  }
}
