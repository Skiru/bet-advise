/* eslint-disable */
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutCommand } from '../commands/logout.command';
import { RefreshTokenRepositoryPortToken } from '../ports/refresh-token-repository.port';
import type { RefreshTokenRepositoryPort } from '../ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from '../ports/api-token-repository.port';
import type { ApiTokenRepositoryPort } from '../ports/api-token-repository.port';
import { TokenServicePortToken } from '../ports/token-service.port';
import type { TokenServicePort } from '../ports/token-service.port';
import { HashServicePortToken } from '../ports/hash-service.port';
import type { HashServicePort } from '../ports/hash-service.port';
import { CachePortToken } from '../../../shared/application/cache/cache.port';
import type { CachePort } from '../../../shared/application/cache/cache.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import type { IAuditModuleApi } from '../../../audit/interfaces/module-api/audit-module.api.interface';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(RefreshTokenRepositoryPortToken)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(ApiTokenRepositoryPortToken)
    private readonly apiTokenRepository: ApiTokenRepositoryPort,
    @Inject(TokenServicePortToken)
    private readonly tokenService: TokenServicePort,
    @Inject(HashServicePortToken)
    private readonly hashService: HashServicePort,
    @Inject(CachePortToken)
    private readonly cache: CachePort,
    @Inject(AUDIT_MODULE_API)
    private readonly auditApi: IAuditModuleApi,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const now = new Date();
    let externalId: string | null = null;
    let externalIntegrationId: string | null = null;

    // 1. Decode access token if valid to find identity
    try {
      const decodedAccess = this.tokenService.verifyToken(command.accessToken);
      externalId = decodedAccess.external_id;
      externalIntegrationId = decodedAccess.id;
    } catch {
      // Access token might be expired, but we can still try to extract external_id / decode without expiration checks,
      // or rely on refresh token's identity.
    }

    // 2. Revoke specific refresh token if provided
    if (command.refreshToken) {
      try {
        const decodedRefresh = this.tokenService.verifyToken(
          command.refreshToken,
        );
        if (decodedRefresh.jti) {
          const hash = this.hashService.sha256(decodedRefresh.jti);
          const storedToken =
            await this.refreshTokenRepository.findByTokenHash(hash);
          if (storedToken) {
            storedToken.revoke(now, 'logout');
            await this.refreshTokenRepository.save(storedToken);
            externalId = externalId || storedToken.externalId;
            externalIntegrationId =
              externalIntegrationId || storedToken.externalIntegrationId;
          }
        }
      } catch {
        // Silent catch for invalid/expired refresh token logout
      }
    }

    // 3. If logoutAll and we resolved the externalId, revoke all active refresh tokens for this user
    if (command.logoutAll && externalId) {
      await this.refreshTokenRepository.revokeAllForExternalId(
        externalId,
        'logout_all',
      );
      await this.apiTokenRepository.deleteByExternalId(externalId);
    }

    // 4. Clear cache for the member
    if (externalId) {
      await this.cache.delete(`external-integration:member:${externalId}`);
      await this.cache.delete(
        `external-integration:linked-accounts:${externalId}`,
      );
      await this.cache.delete(`session:active:${externalId}`);
    }

    // 5. Log audit trail
    if (externalIntegrationId && externalId) {
      await this.auditApi.log(
        'USER_LOGGED_OUT',
        'Member',
        externalIntegrationId,
        externalId,
        { logoutAll: command.logoutAll },
      );
    }
  }
}
