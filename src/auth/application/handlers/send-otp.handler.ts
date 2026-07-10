import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { randomInt } from 'crypto';
import { SendOtpCommand } from '../commands/send-otp.command';
import { ExternalIntegrationPointServicePortToken } from '../ports/external-integration-point-service.port';
import type { ExternalIntegrationPointServicePort } from '../ports/external-integration-point-service.port';
import { CachePortToken } from '../../../shared/application/cache/cache.port';
import type { CachePort } from '../../../shared/application/cache/cache.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import type { IAuditModuleApi } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { UserNotFoundError } from '../../domain/auth-errors';

@CommandHandler(SendOtpCommand)
export class SendOtpHandler implements ICommandHandler<SendOtpCommand> {
  constructor(
    @Inject(ExternalIntegrationPointServicePortToken)
    private readonly externalIntegrationService: ExternalIntegrationPointServicePort,
    @Inject(CachePortToken)
    private readonly cache: CachePort,
    @Inject(AUDIT_MODULE_API)
    private readonly auditApi: IAuditModuleApi,
  ) {}

  async execute(
    command: SendOtpCommand,
  ): Promise<{ mobile: string; otp: string }> {
    const normalizedMobile = command.mobile.replace(/\s+/g, '');

    // 1. Resolve member from external integration point
    const member =
      await this.externalIntegrationService.findPersonByMobile(
        normalizedMobile,
      );
    if (!member) {
      throw new UserNotFoundError(normalizedMobile);
    }

    // 2. Generate OTP (cryptographically secure)
    const otp = randomInt(1000, 10000).toString(); // 4-digit OTP

    // 3. Save OTP in cache (5 minutes TTL)
    await this.cache.set(`otp:${normalizedMobile}`, otp, 300);

    // 4. Log Audit Event
    await this.auditApi.log('OTP_SENT', 'Member', member.id, normalizedMobile, {
      deviceId: command.deviceId,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
    });

    return {
      mobile: normalizedMobile,
      otp, // return OTP for verification / mobile flow testing
    };
  }
}
