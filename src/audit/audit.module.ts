import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './infrastructure/entities/audit-log.entity';
import { TypeOrmAuditLogRepository } from './infrastructure/typeorm-audit-log.repository';
import { AuditLogService } from './application/audit-log.service';
import { AUDIT_MODULE_API } from './interfaces/module-api/audit-module.api.interface';
import { AuditModuleApi } from './interfaces/module-api/audit-module.api';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [
    TypeOrmAuditLogRepository,
    AuditLogService,
    {
      provide: AUDIT_MODULE_API,
      useClass: AuditModuleApi,
    },
  ],
  exports: [AuditLogService, AUDIT_MODULE_API],
})
export class AuditModule {}
