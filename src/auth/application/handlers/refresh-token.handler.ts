import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { generateUuidV7 } from '../../../shared/domain/uuid';
import { RefreshTokenCommand } from '../commands/refresh-token.command';
import { RefreshTokenRepositoryPortToken } from '../ports/refresh-token-repository.port';
import type { RefreshTokenRepositoryPort } from '../ports/refresh-token-repository.port';
import { TokenServicePortToken } from '../ports/token-service.port';
import type { TokenServicePort } from '../ports/token-service.port';
import { HashServicePortToken } from '../ports/hash-service.port';
import type { HashServicePort } from '../ports/hash-service.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import type { IAuditModuleApi } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { RefreshToken } from '../../domain/refresh-token.entity';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../../domain/auth-constants';
import {
  AuthenticationError,
  DeviceBindingError,
  TokenExpiredError,
  TokenRevokedError,
} from '../../domain/auth-errors';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand> {
  constructor(
    @Inject(RefreshTokenRepositoryPortToken)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(TokenServicePortToken)
    private readonly tokenService: TokenServicePort,
    @Inject(HashServicePortToken)
    private readonly hashService: HashServicePort,
    @Inject(AUDIT_MODULE_API)
    private readonly auditApi: IAuditModuleApi,
  ) {}

  async execute(command: RefreshTokenCommand) {
    // 1. Validate refresh JWT
    let payload: Record<string, any>;
    try {
      payload = this.tokenService.verifyToken(command.refreshToken);
    } catch {
      throw new AuthenticationError('Invalid refresh token.');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new AuthenticationError('Invalid token type.');
    }

    // 2. Hash the jti and lookup in database
    const tokenHash = this.hashService.sha256(payload.jti as string);
    const storedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw new AuthenticationError('Refresh token session not found.');
    }

    const now = new Date();

    // 3. Verify status (expired / revoked / external_id mismatch)
    if (storedToken.isExpired(now)) {
      throw new TokenExpiredError();
    }
    if (storedToken.isRevoked()) {
      throw new TokenRevokedError(storedToken.revokedReason || 'unknown');
    }
    if (storedToken.externalId !== payload.external_id) {
      throw new AuthenticationError('Token identity mismatch.');
    }

    // 4. Device Binding Check
    if (storedToken.deviceId !== command.deviceId) {
      throw new DeviceBindingError('Device mismatch during refresh rotation.');
    }

    // 5. Update old token usage and mark as revoked/rotated
    storedToken.use(now);
    storedToken.revoke(now, 'rotated');

    // 6. Generate the NEW token pair
    const newSalt = this.hashService.generateSalt();
    const newAccessTokenExpiry = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
    const newRefreshTokenExpiry = new Date(
      now.getTime() + REFRESH_TOKEN_TTL_MS,
    );

    const newJti = generateUuidV7();
    const newHash = this.hashService.sha256(newJti);

    const newRefreshTokenEntity = RefreshToken.create(
      newJti,
      storedToken.externalId,
      storedToken.preferredBookmaker,
      storedToken.externalIntegrationId,
      storedToken.activeBookmaker,
      command.deviceId,
      newSalt,
      newHash,
      now,
      newRefreshTokenExpiry,
      storedToken.deviceDetails,
      storedToken.oneSignalSubscriptionId,
      command.userAgent,
      command.ipAddress,
    );

    // 7. Perform atomic token rotation inside a single database transaction
    await this.refreshTokenRepository.rotate(
      storedToken,
      newRefreshTokenEntity,
    );

    // 8. Generate JWTs
    const identityClaims = {
      external_id: storedToken.externalId,
      preferred_bookmaker: storedToken.preferredBookmaker,
      id: storedToken.externalIntegrationId,
      salt: newSalt,
    };

    const newAccessToken = this.tokenService.generateAccessToken({
      ...identityClaims,
      type: 'access',
    });

    const newRefreshTokenStr = this.tokenService.generateRefreshToken({
      ...identityClaims,
      jti: newJti,
      type: 'refresh',
    });

    // 9. Log Audit Trail
    await this.auditApi.log(
      'TOKEN_REFRESHED',
      'Member',
      storedToken.externalIntegrationId,
      storedToken.externalId,
      { deviceId: command.deviceId, ipAddress: command.ipAddress },
    );

    return {
      token: newAccessToken,
      refresh_token: newRefreshTokenStr,
      tokenExpiry: newAccessTokenExpiry.toISOString(),
      refresh_token_expires_at: newRefreshTokenExpiry.toISOString(),
    };
  }
}
