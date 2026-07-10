/* eslint-disable */
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ExternalIntegrationPointServicePortToken } from '../../../application/ports/external-integration-point-service.port';
import type { ExternalIntegrationPointServicePort } from '../../../application/ports/external-integration-point-service.port';
import { CachePortToken } from '../../../../shared/application/cache/cache.port';
import type { CachePort } from '../../../../shared/application/cache/cache.port';

@Injectable()
export class MemberOwnershipGuard implements CanActivate {
  constructor(
    @Inject(ExternalIntegrationPointServicePortToken)
    private readonly externalIntegrationService: ExternalIntegrationPointServicePort,
    @Inject(CachePortToken)
    private readonly cache: CachePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user) {
      throw new ForbiddenException('User context is missing.');
    }

    const parentExternalId = user.external_id;

    // Resolve requested member ID from body, param, or query
    const requestedMemberId =
      request.params.memberId ||
      request.body.personKey ||
      request.body.memberId ||
      request.query.memberId;

    if (!requestedMemberId) {
      // If no resource owner ID is found in the request, allow access by default
      return true;
    }

    // 1. Direct ownership check
    if (parentExternalId === requestedMemberId) {
      return true;
    }

    // 2. Linked accounts check (with 3-day caching)
    const cacheKey = `external-integration:linked-accounts:${parentExternalId}`;
    const linkedAccountsList = await this.cache.remember<string[]>(
      cacheKey,
      3 * 24 * 60 * 60, // 3 days in seconds
      async () => {
        return this.externalIntegrationService.getLinkedAccounts(
          parentExternalId,
        );
      },
    );

    if (linkedAccountsList.includes(requestedMemberId)) {
      return true;
    }

    throw new ForbiddenException(
      'You do not have permission to access this member resource.',
    );
  }
}
