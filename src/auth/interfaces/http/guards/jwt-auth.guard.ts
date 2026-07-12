/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenServicePortToken } from '../../../application/ports/token-service.port';
import type { TokenServicePort } from '../../../application/ports/token-service.port';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Principal } from '../../../domain/principal.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenServicePortToken)
    private readonly tokenService: TokenServicePort,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    try {
      const payload = await this.tokenService.verifyToken(token);

      let scopes: string[] = [];
      if (typeof payload.scope === 'string') {
        scopes = payload.scope.split(' ').filter((s) => s.length > 0);
      } else if (Array.isArray(payload.scopes)) {
        scopes = payload.scopes;
      } else if (Array.isArray(payload.scope)) {
        scopes = payload.scope;
      }

      const principal: Principal = {
        id: payload.sub || payload.id || 'unknown',
        tenantId: payload.tenant_id || payload.tenantId || '',
        scopes,
        email: payload.email,
        roles: payload.roles,
      };

      if (!principal.tenantId) {
        throw new UnauthorizedException(
          'Token is missing mandatory tenant_id claim.',
        );
      }

      request.principal = principal;
      request.tenantId = principal.tenantId;

      return true;
    } catch (error: any) {
      throw new UnauthorizedException(
        error.message || 'Invalid or expired token.',
      );
    }
  }
}
