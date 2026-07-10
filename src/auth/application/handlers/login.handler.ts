import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { generateUuidV7 } from '../../../shared/domain/uuid';
import { LoginCommand } from '../commands/login.command';
import { ExternalIntegrationPointServicePortToken } from '../ports/external-integration-point-service.port';
import type { ExternalIntegrationPointServicePort } from '../ports/external-integration-point-service.port';
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
import { RefreshToken } from '../../domain/refresh-token.entity';
import { ApiToken } from '../../domain/api-token.entity';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../../domain/auth-constants';
import {
  UserNotFoundError,
  DeviceBindingError,
  AuthenticationError,
} from '../../domain/auth-errors';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    @Inject(ExternalIntegrationPointServicePortToken)
    private readonly externalIntegrationService: ExternalIntegrationPointServicePort,
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
    private readonly tenantContext: TenantContext,
  ) {}

  async execute(command: LoginCommand) {
    const normalizedMobile = command.mobile.replace(/\s+/g, '');

    // 1. Load member from external integration point
    const member =
      await this.externalIntegrationService.findPersonByMobile(
        normalizedMobile,
      );
    if (!member) {
      throw new UserNotFoundError(normalizedMobile);
    }

    // 2. Reject disabled members
    if (member.isDisabled) {
      throw new AuthenticationError('Your account has been disabled.');
    }

    // 3. Device Binding Check
    // Get the latest refresh token to verify device binding
    const latestToken =
      await this.refreshTokenRepository.findLatestByExternalId(
        member.externalId,
      );
    if (latestToken && latestToken.deviceId !== command.deviceId) {
      throw new DeviceBindingError();
    }

    // 4. Generate session salt
    const salt = this.hashService.generateSalt();

    // 5. Calculate expiries
    const now = new Date();
    const accessTokenExpiry = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
    const refreshTokenExpiry = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    // 6. Mint Refresh Token row
    const jti = generateUuidV7();
    const tokenHash = this.hashService.sha256(jti);

    const refreshTokenEntity = RefreshToken.create(
      jti,
      this.tenantContext.getTenantId(),
      member.externalId,
      member.preferredBookmaker,
      member.id,
      member.activeBookmaker || member.preferredBookmaker,
      command.deviceId,
      salt,
      tokenHash,
      now,
      refreshTokenExpiry,
      command.deviceDetails,
      null, // one_signal_subscription_id initially null, updated later
      command.userAgent,
      command.ipAddress,
    );

    await this.refreshTokenRepository.save(refreshTokenEntity);

    // 7. Mint Access and Refresh JWTs
    const identityClaims = {
      external_id: member.externalId,
      preferred_bookmaker: member.preferredBookmaker,
      id: member.id,
      salt,
    };

    const accessToken = this.tokenService.generateAccessToken({
      ...identityClaims,
      type: 'access',
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      ...identityClaims,
      jti,
      type: 'refresh',
    });

    // 8. Upsert Legacy ApiToken for backward compatibility
    await this.apiTokenRepository.deleteByExternalId(member.externalId);

    const legacyTokenStr = this.hashService.generateRandomToken();
    const apiTokenEntity = ApiToken.create(
      legacyTokenStr,
      this.tenantContext.getTenantId(),
      member.externalId,
      member.preferredBookmaker,
      member.id,
      member.activeBookmaker || member.preferredBookmaker,
      command.deviceId,
      refreshTokenExpiry,
      null, // oneSignalSubscriptionId
      command.deviceDetails,
    );

    await this.apiTokenRepository.save(apiTokenEntity);

    // 9. Cache active session status to true
    await this.cache.set(`session:active:${member.externalId}`, true, 300);

    // 10. Log Audit trail
    await this.auditApi.log(
      'USER_LOGGED_IN',
      'Member',
      member.id,
      member.externalId,
      { deviceId: command.deviceId, ipAddress: command.ipAddress },
    );

    return {
      token: accessToken,
      refresh_token: refreshToken,
      tokenExpiry: accessTokenExpiry.toISOString(),
      refresh_token_expires_at: refreshTokenExpiry.toISOString(),
    };
  }
}
