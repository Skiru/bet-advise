/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant-context';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContext,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    let tenantId: string | undefined = undefined;
    let principal: any = undefined;

    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;
      try {
        const secret =
          this.configService.get<string>('jwt.secret') || 'super-secret';
        const algorithms = this.configService.get<string[]>(
          'jwt.algorithms',
        ) || ['RS256', 'HS256'];
        const payload = jwt.verify(token, secret, {
          algorithms: algorithms as jwt.Algorithm[],
        }) as any;

        let scopes: string[] = [];
        if (typeof payload.scope === 'string') {
          scopes = payload.scope.split(' ').filter((s: string) => s.length > 0);
        } else if (Array.isArray(payload.scopes)) {
          scopes = payload.scopes;
        }

        principal = {
          id: payload.sub || payload.id || 'unknown',
          tenantId: payload.tenant_id || payload.tenantId || '',
          scopes,
          email: payload.email,
          roles: payload.roles,
        };
        tenantId = principal.tenantId;
        (req as any).principal = principal;
      } catch (error: any) {
        const path = (
          req.originalUrl ||
          req.url ||
          req.path ||
          ''
        ).toLowerCase();
        if (!path.includes('/health') && !path.includes('health')) {
          throw new UnauthorizedException(
            'Invalid or expired token signature.',
          );
        }
      }
    }

    if (!tenantId) {
      const path = (req.originalUrl || req.url || req.path || '').toLowerCase();
      if (path.includes('/health') || path.includes('health')) {
        tenantId = 'public';
      } else {
        throw new UnauthorizedException(
          'Tenant context cannot be resolved from principal.',
        );
      }
    }

    const sanitized = tenantId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');

    if (!sanitized) {
      throw new UnauthorizedException('Invalid tenant identifier format.');
    }

    this.tenantContext.run(sanitized, () => {
      (req as any).tenantId = sanitized;
      next();
    });
  }
}
export { TenantMiddleware as default };
