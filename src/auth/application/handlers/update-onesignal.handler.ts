import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateOneSignalSubIdCommand } from '../commands/update-onesignal.command';
import { RefreshTokenRepositoryPortToken } from '../ports/refresh-token-repository.port';
import type { RefreshTokenRepositoryPort } from '../ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from '../ports/api-token-repository.port';
import type { ApiTokenRepositoryPort } from '../ports/api-token-repository.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import type { IAuditModuleApi } from '../../../audit/interfaces/module-api/audit-module.api.interface';

@CommandHandler(UpdateOneSignalSubIdCommand)
export class UpdateOneSignalSubIdHandler implements ICommandHandler<UpdateOneSignalSubIdCommand> {
  constructor(
    @Inject(RefreshTokenRepositoryPortToken)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(ApiTokenRepositoryPortToken)
    private readonly apiTokenRepository: ApiTokenRepositoryPort,
    @Inject(AUDIT_MODULE_API)
    private readonly auditApi: IAuditModuleApi,
  ) {}

  async execute(command: UpdateOneSignalSubIdCommand): Promise<void> {
    // 1. Update active refresh tokens
    const activeTokens =
      await this.refreshTokenRepository.findActiveByExternalId(
        command.externalId,
      );
    for (const token of activeTokens) {
      token.updateOneSignalSubscriptionId(command.subscriptionId);
      await this.refreshTokenRepository.save(token);
    }

    // 2. Update compatibility api_token
    const apiToken = await this.apiTokenRepository.findByExternalId(
      command.externalId,
    );
    if (apiToken) {
      apiToken.updateOneSignalSubscriptionId(command.subscriptionId);
      await this.apiTokenRepository.save(apiToken);
    }

    // 3. Log audit event
    // Find the externalIntegrationId from the latest token if available
    let externalIntegrationId = 'unknown';
    const latestToken =
      await this.refreshTokenRepository.findLatestByExternalId(
        command.externalId,
      );
    if (latestToken) {
      externalIntegrationId = latestToken.externalIntegrationId;
    }

    await this.auditApi.log(
      'ONESIGNAL_UPDATED',
      'Member',
      externalIntegrationId,
      command.externalId,
      { subscriptionId: command.subscriptionId },
    );
  }
}
