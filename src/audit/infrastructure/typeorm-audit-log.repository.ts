import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class TypeOrmAuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  async create(
    actor: string | null,
    action: string,
    entityType: string,
    entityId: string,
    payload?: Record<string, unknown> | null,
  ): Promise<AuditLogEntity> {
    const entity = this.repo.create({
      id: randomUUID(),
      actor,
      action,
      entityType,
      entityId,
      payload: payload || null,
    });
    return this.repo.save(entity);
  }
}
