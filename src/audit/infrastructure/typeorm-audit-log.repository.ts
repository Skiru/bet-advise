import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { generateUuidV7 } from '../../shared/domain/uuid';
import { TenantContext } from '../../shared/infrastructure/tenant/tenant-context';

@Injectable()
export class TypeOrmAuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
    private readonly tenantContext: TenantContext,
  ) {}

  async create(
    actor: string | null,
    action: string,
    entityType: string,
    entityId: string,
    payload?: Record<string, unknown> | null,
  ): Promise<AuditLogEntity> {
    const entity = this.repo.create({
      id: generateUuidV7(),
      tenantId: this.tenantContext.getTenantId(),
      actor,
      action,
      entityType,
      entityId,
      payload: payload || null,
    });
    return this.repo.save(entity);
  }
}
