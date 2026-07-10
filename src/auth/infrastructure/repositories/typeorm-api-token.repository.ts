import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTokenRepositoryPort } from '../../application/ports/api-token-repository.port';
import { ApiTokenEntity } from '../entities/api-token.entity';
import { ApiToken } from '../../domain/api-token.entity';
import { ApiTokenMapper } from '../api-token.mapper';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context';

@Injectable()
export class TypeOrmApiTokenRepository implements ApiTokenRepositoryPort {
  constructor(
    @InjectRepository(ApiTokenEntity)
    private readonly repo: Repository<ApiTokenEntity>,
    private readonly mapper: ApiTokenMapper,
    private readonly tenantContext: TenantContext,
  ) {}

  async save(token: ApiToken): Promise<void> {
    const entity = this.mapper.toEntity(token);
    entity.tenantId = this.tenantContext.getTenantId();
    await this.repo.save(entity);
  }

  async findByExternalId(externalId: string): Promise<ApiToken | null> {
    const entity = await this.repo.findOne({
      where: { externalId, tenantId: this.tenantContext.getTenantId() },
    });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async findByToken(token: string): Promise<ApiToken | null> {
    const entity = await this.repo.findOne({
      where: { token, tenantId: this.tenantContext.getTenantId() },
    });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async deleteByExternalId(externalId: string): Promise<void> {
    await this.repo.delete({
      externalId,
      tenantId: this.tenantContext.getTenantId(),
    });
  }
}
