import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const principal = request.principal;

    if (!principal) {
      throw new ForbiddenException('No authenticated principal found.');
    }

    const hasAll = requiredPermissions.every((perm) =>
      principal.scopes.includes(perm),
    );

    if (!hasAll) {
      throw new ForbiddenException(
        `Principal lacks required scopes: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
