import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenRepositoryPort } from '../../application/ports/refresh-token-repository.port';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { RefreshToken } from '../../domain/refresh-token.entity';

@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>,
  ) {}

  private mapToDomain(entity: RefreshTokenEntity): RefreshToken {
    return new RefreshToken(
      entity.id,
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

  private mapToEntity(domain: RefreshToken): RefreshTokenEntity {
    const entity = new RefreshTokenEntity();
    entity.id = domain.id;
    entity.externalId = domain.externalId;
    entity.preferredBookmaker = domain.preferredBookmaker;
    entity.externalIntegrationId = domain.externalIntegrationId;
    entity.activeBookmaker = domain.activeBookmaker;
    entity.deviceId = domain.deviceId;
    entity.salt = domain.salt;
    entity.tokenHash = domain.tokenHash;
    entity.issuedAt = domain.issuedAt;
    entity.expiresAt = domain.expiresAt;
    entity.deviceDetails = domain.deviceDetails;
    entity.oneSignalSubscriptionId = domain.oneSignalSubscriptionId;
    entity.revokedAt = domain.revokedAt;
    entity.revokedReason = domain.revokedReason;
    entity.lastUsedAt = domain.lastUsedAt;
    entity.userAgent = domain.userAgent;
    entity.ipAddress = domain.ipAddress;
    return entity;
  }

  async save(token: RefreshToken): Promise<void> {
    const entity = this.mapToEntity(token);
    await this.repo.save(entity);
  }

  async rotate(oldToken: RefreshToken, newToken: RefreshToken): Promise<void> {
    const queryRunner = this.repo.manager.connection.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 1. Save old token
      const oldEntity = this.mapToEntity(oldToken);
      await queryRunner.manager.save(RefreshTokenEntity, oldEntity);

      // 2. Save new token
      const newEntity = this.mapToEntity(newToken);
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
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const entity = await this.repo.findOne({ where: { tokenHash: hash } });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async findActiveByExternalId(externalId: string): Promise<RefreshToken[]> {
    const entities = await this.repo
      .createQueryBuilder('token')
      .where('token.external_id = :externalId', { externalId })
      .andWhere('token.revoked_at IS NULL')
      .andWhere('token.expires_at > NOW()')
      .getMany();
    return entities.map((e) => this.mapToDomain(e));
  }

  async findLatestByExternalId(
    externalId: string,
  ): Promise<RefreshToken | null> {
    const entity = await this.repo.findOne({
      where: { externalId },
      order: { issuedAt: 'DESC' },
    });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async revoke(id: string, reason: string): Promise<void> {
    await this.repo.update(id, {
      revokedAt: new Date(),
      revokedReason: reason,
    });
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
      .andWhere('revoked_at IS NULL')
      .execute();
  }
}
