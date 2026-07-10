import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoginUsingOtpCommand } from '../commands/login-using-otp.command';
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
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../../domain/auth-constants';
import {
  InvalidOtpError,
  OtpExpiredError,
  UserNotFoundError,
  DeviceBindingError,
  AuthenticationError,
} from '../../domain/auth-errors';

@CommandHandler(LoginUsingOtpCommand)
export class LoginUsingOtpHandler implements ICommandHandler<LoginUsingOtpCommand> {
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
  ) {}

  async execute(command: LoginUsingOtpCommand) {
    const normalizedMobile = command.mobile.replace(/\s+/g, '');

    // 1. Verify OTP
    const cachedOtp = await this.cache.get<string>(`otp:${normalizedMobile}`);
    if (!cachedOtp) {
      throw new OtpExpiredError();
    }
    if (cachedOtp !== command.otp) {
      throw new InvalidOtpError();
    }
    // Delete OTP once verified successfully
    await this.cache.delete(`otp:${normalizedMobile}`);

    // 2. Load member from external integration point
    const member =
      await this.externalIntegrationService.findPersonByMobile(
        normalizedMobile,
      );
    if (!member) {
      throw new UserNotFoundError(normalizedMobile);
    }

    // 3. Reject disabled members
    if (member.isDisabled) {
      throw new AuthenticationError('Your account has been disabled.');
    }

    // 4. Device Binding Check
    // Get the latest refresh token to verify device binding
    const latestToken =
      await this.refreshTokenRepository.findLatestByExternalId(
        member.externalId,
      );
    if (latestToken && latestToken.deviceId !== command.deviceId) {
      throw new DeviceBindingError();
    }

    // 5. Generate session salt
    const salt = this.hashService.generateSalt();

    // 6. Calculate expiries
    const now = new Date();
    const accessTokenExpiry = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
    const refreshTokenExpiry = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    // 7. Mint Refresh Token row
    const jti = randomUUID();
    const tokenHash = this.hashService.sha256(jti);

    const refreshTokenEntity = RefreshToken.create(
      jti,
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

    // 8. Mint Access and Refresh JWTs
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

    // 9. Upsert Legacy ApiToken for backward compatibility
    await this.apiTokenRepository.deleteByExternalId(member.externalId);

    const legacyTokenStr = this.hashService.generateRandomToken();
    const apiTokenEntity = ApiToken.create(
      legacyTokenStr,
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

    // 10. Cache active session status to true
    await this.cache.set(`session:active:${member.externalId}`, true, 300);

    // 11. Log Audit trail
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
