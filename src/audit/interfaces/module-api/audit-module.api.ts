import { Injectable } from '@nestjs/common';
import { IAuditModuleApi } from './audit-module.api.interface';
import { AuditLogService } from '../../application/audit-log.service';

@Injectable()
export class AuditModuleApi implements IAuditModuleApi {
  constructor(private readonly auditLogService: AuditLogService) {}

  async log(
    action: string,
    entityType: string,
    entityId: string,
    actor: string | null = 'system',
    payload?: Record<string, unknown> | null,
  ): Promise<any> {
    return this.auditLogService.log(
      action,
      entityType,
      entityId,
      actor,
      payload,
    );
  }
}
