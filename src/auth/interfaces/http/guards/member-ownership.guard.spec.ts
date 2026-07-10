/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MemberOwnershipGuard } from './member-ownership.guard';
import { ExternalIntegrationPointServicePortToken } from '../../../application/ports/external-integration-point-service.port';
import { CachePortToken } from '../../../../shared/application/cache/cache.port';

describe('MemberOwnershipGuard', () => {
  let guard: MemberOwnershipGuard;
  let mockExternalIntegrationService: { getLinkedAccounts: jest.Mock };
  let mockCache: { remember: jest.Mock };

  beforeEach(async () => {
    mockExternalIntegrationService = { getLinkedAccounts: jest.fn() };
    mockCache = { remember: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberOwnershipGuard,
        {
          provide: ExternalIntegrationPointServicePortToken,
          useValue: mockExternalIntegrationService,
        },
        { provide: CachePortToken, useValue: mockCache },
      ],
    }).compile();

    guard = module.get<MemberOwnershipGuard>(MemberOwnershipGuard);
  });

  const createMockContext = (
    user: any,
    requestPayload: { params?: any; body?: any; query?: any },
  ): ExecutionContext => {
    const request = {
      user,
      params: requestPayload.params || {},
      body: requestPayload.body || {},
      query: requestPayload.query || {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if requested member ID matches authenticated external_id', async () => {
    const context = createMockContext(
      { external_id: 'ext-123' },
      { params: { memberId: 'ext-123' } },
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockCache.remember).not.toHaveBeenCalled();
  });

  it('should allow access if requested member ID belongs to linked accounts list (cached check)', async () => {
    mockCache.remember.mockImplementation(async (key, ttl, factory) => {
      // Simulate cache execution returning linked accounts list
      return ['linked-bettor-1', 'linked-bettor-2'];
    });

    const context = createMockContext(
      { external_id: 'ext-123' },
      { body: { personKey: 'linked-bettor-1' } }, // requested personKey is linked-bettor-1
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockCache.remember).toHaveBeenCalled();
  });

  it('should throw ForbiddenException if requested member ID does not belong to user or linked accounts', async () => {
    mockCache.remember.mockImplementation(async (key, ttl, factory) => {
      return ['linked-bettor-1'];
    });

    const context = createMockContext(
      { external_id: 'ext-123' },
      { query: { memberId: 'unrelated-member' } },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow access if requested ID is not present in route/body/query', async () => {
    const context = createMockContext(
      { external_id: 'ext-123' },
      {}, // no member ID parameter anywhere
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
