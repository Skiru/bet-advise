import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenRepositoryPort } from '../../application/ports/refresh-token-repository.port';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { RefreshToken } from '../../domain/refresh-token.entity';
import { RefreshTokenMapper } from '../refresh-token.mapper';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context';

@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>,
    private readonly mapper: RefreshTokenMapper,
    private readonly tenantContext: TenantContext,
  ) {}

  async save(token: RefreshToken): Promise<void> {
    const entity = this.mapper.toEntity(token);
    // Explicitly enforce current tenant ID context on write
    entity.tenantId = this.tenantContext.getTenantId();
    await this.repo.save(entity);
  }

  async rotate(oldToken: RefreshToken, newToken: RefreshToken): Promise<void> {
    const queryRunner = this.repo.manager.connection.createQueryRunner();
    const tenantId = this.tenantContext.getTenantId();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 1. Save old token
      const oldEntity = this.mapper.toEntity(oldToken);
      oldEntity.tenantId = tenantId;
      await queryRunner.manager.save(RefreshTokenEntity, oldEntity);

      // 2. Save new token
      const newEntity = this.mapper.toEntity(newToken);
      newEntity.tenantId = tenantId;
      await queryRunner.manager.save(RefreshTokenEntity, newEntity);

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const entity = await this.repo.findOne({
      where: { id, tenantId: this.tenantContext.getTenantId() },
    });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const entity = await this.repo.findOne({
      where: { tokenHash: hash, tenantId: this.tenantContext.getTenantId() },
    });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async findActiveByExternalId(externalId: string): Promise<RefreshToken[]> {
    const entities = await this.repo
      .createQueryBuilder('token')
      .where('token.external_id = :externalId', { externalId })
      .andWhere('token.tenant_id = :tenantId', {
        tenantId: this.tenantContext.getTenantId(),
      })
      .andWhere('token.revoked_at IS NULL')
      .andWhere('token.expires_at > NOW()')
      .getMany();
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findLatestByExternalId(
    externalId: string,
  ): Promise<RefreshToken | null> {
    const entity = await this.repo.findOne({
      where: { externalId, tenantId: this.tenantContext.getTenantId() },
      order: { issuedAt: 'DESC' },
    });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async revoke(id: string, reason: string): Promise<void> {
    await this.repo.update(
      { id, tenantId: this.tenantContext.getTenantId() },
      {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );
  }

  async revokeAllForExternalId(
    externalId: string,
    reason: string,
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where('external_id = :externalId', { externalId })
      .andWhere('tenant_id = :tenantId', {
        tenantId: this.tenantContext.getTenantId(),
      })
      .andWhere('revoked_at IS NULL')
      .execute();
  }
}
