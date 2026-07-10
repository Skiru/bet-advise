/* eslint-disable */
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenServicePortToken } from '../../../application/ports/token-service.port';
import type { TokenServicePort } from '../../../application/ports/token-service.port';
import { RefreshTokenRepositoryPortToken } from '../../../application/ports/refresh-token-repository.port';
import type { RefreshTokenRepositoryPort } from '../../../application/ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from '../../../application/ports/api-token-repository.port';
import type { ApiTokenRepositoryPort } from '../../../application/ports/api-token-repository.port';
import { CachePortToken } from '../../../../shared/application/cache/cache.port';
import type { CachePort } from '../../../../shared/application/cache/cache.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenServicePortToken)
    private readonly tokenService: TokenServicePort,
    @Inject(RefreshTokenRepositoryPortToken)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(ApiTokenRepositoryPortToken)
    private readonly apiTokenRepository: ApiTokenRepositoryPort,
    @Inject(CachePortToken)
    private readonly cache: CachePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    // Extract token (support Bearer <token> and raw token format)
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    let payload: Record<string, any>;
    try {
      payload = this.tokenService.verifyToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type.');
    }

    const externalId = payload.external_id;

    // Presence check: confirm that external_id exists in either active refresh_tokens or legacy api_tokens
    // Cached in Redis to shield the database from request-level query pressure
    const cacheKey = `session:active:${externalId}`;
    let isPresent = await this.cache.get<boolean>(cacheKey);

    if (isPresent === null) {
      const activeRefreshTokens =
        await this.refreshTokenRepository.findActiveByExternalId(externalId);
      isPresent = activeRefreshTokens.length > 0;

      if (!isPresent) {
        const apiToken =
          await this.apiTokenRepository.findByExternalId(externalId);
        if (apiToken) {
          isPresent = true;
        }
      }

      await this.cache.set(cacheKey, isPresent, 300); // 5 minutes TTL
    }

    if (!isPresent) {
      throw new UnauthorizedException('Session has been revoked or expired.');
    }

    // Merge into request object for downstream controllers and custom decorators
    request.user = payload;
    request.jwt_user = payload;
    request.jwt_claims = payload;

    return true;
  }
}
