import { Injectable } from '@nestjs/common';
import { TypeOrmAuditLogRepository } from '../infrastructure/typeorm-audit-log.repository';

@Injectable()
export class AuditLogService {
  constructor(private readonly repository: TypeOrmAuditLogRepository) {}

  async log(
    action: string,
    entityType: string,
    entityId: string,
    actor: string | null = 'system',
    payload?: Record<string, unknown> | null,
  ) {
    return this.repository.create(actor, action, entityType, entityId, payload);
  }
}
