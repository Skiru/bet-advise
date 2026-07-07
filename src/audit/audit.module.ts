import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './infrastructure/entities/audit-log.entity';
import { TypeOrmAuditLogRepository } from './infrastructure/typeorm-audit-log.repository';
import { AuditLogService } from './application/audit-log.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [TypeOrmAuditLogRepository, AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
