import { Injectable, NestMiddleware } from '@nestjs/common';
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
    // 1. Read default or x-tenant-id header
    let tenantId = req.headers['x-tenant-id'] as string | undefined;

    // 2. Inspect Authorization header for signed JWT.
    // If authenticated, the tenant_id in JWT always takes absolute priority
    // to prevent tenants from falsifying tenant context on authenticated endpoints (BOLA/IDOR protection).
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;
      try {
        const secret =
          this.configService.get<string>('jwt.secret') || 'super-secret';
        const verified = jwt.verify(token, secret) as { tenant_id?: string };
        if (verified && verified.tenant_id) {
          tenantId = verified.tenant_id;
        }
      } catch {
        // Signature verification failed (forged, malformed, or expired token).
        // We DO NOT trust the token's claims, sealing BOLA/IDOR vulnerabilities!
      }
    }

    // 3. Sanitize and validate the tenant identifier (security baseline)
    if (tenantId) {
      // Allow only alphanumeric, dashes, and underscores to prevent injection attempts
      tenantId = tenantId
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');
    }

    // 4. Default to 'default' if not specified or clean result is empty
    if (!tenantId) {
      tenantId = 'default';
    }

    // 5. Run request within AsyncLocalStorage scope
    this.tenantContext.run(tenantId, () => {
      Object.assign(req, { tenantId });
      next();
    });
  }
}
