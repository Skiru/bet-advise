/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenServicePortToken } from '../../../application/ports/token-service.port';
import { RefreshTokenRepositoryPortToken } from '../../../application/ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from '../../../application/ports/api-token-repository.port';
import { CachePortToken } from '../../../../shared/application/cache/cache.port';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockTokenService: { verifyToken: jest.Mock };
  let mockRefreshTokenRepo: { findActiveByExternalId: jest.Mock };
  let mockApiTokenRepo: { findByExternalId: jest.Mock };
  let mockCache: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    mockTokenService = { verifyToken: jest.fn() };
    mockRefreshTokenRepo = { findActiveByExternalId: jest.fn() };
    mockApiTokenRepo = { findByExternalId: jest.fn() };
    mockCache = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: TokenServicePortToken, useValue: mockTokenService },
        {
          provide: RefreshTokenRepositoryPortToken,
          useValue: mockRefreshTokenRepo,
        },
        { provide: ApiTokenRepositoryPortToken, useValue: mockApiTokenRepo },
        { provide: CachePortToken, useValue: mockCache },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  const createMockContext = (
    authHeader: string | undefined,
  ): ExecutionContext => {
    const request = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should throw UnauthorizedException if Authorization header is missing', async () => {
    const context = createMockContext(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should authorize and attach user to request if JWT and session presence check succeeds', async () => {
    mockTokenService.verifyToken.mockReturnValue({
      external_id: 'ext-123',
      type: 'access',
    });
    mockRefreshTokenRepo.findActiveByExternalId.mockResolvedValue([
      { id: 'token-active' },
    ]); // Present!

    const context = createMockContext('Bearer valid-jwt');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({ external_id: 'ext-123', type: 'access' });
  });

  it('should authorize through legacy API token if no active refresh token exists', async () => {
    mockTokenService.verifyToken.mockReturnValue({
      external_id: 'ext-123',
      type: 'access',
    });
    mockRefreshTokenRepo.findActiveByExternalId.mockResolvedValue([]); // No active refresh tokens
    mockApiTokenRepo.findByExternalId.mockResolvedValue({
      token: 'legacy-token',
    }); // Present in api_tokens!

    const context = createMockContext('valid-jwt-raw-format'); // raw token format
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.user.external_id).toBe('ext-123');
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    mockTokenService.verifyToken.mockImplementation(() => {
      throw new Error('Verification failed');
    });

    const context = createMockContext('Bearer invalid-jwt');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token type is not access', async () => {
    mockTokenService.verifyToken.mockReturnValue({
      external_id: 'ext-123',
      type: 'refresh',
    }); // Wrong type!

    const context = createMockContext('Bearer refresh-jwt');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if session is completely revoked', async () => {
    mockTokenService.verifyToken.mockReturnValue({
      external_id: 'ext-123',
      type: 'access',
    });
    mockRefreshTokenRepo.findActiveByExternalId.mockResolvedValue([]); // No active refresh tokens
    mockApiTokenRepo.findByExternalId.mockResolvedValue(null); // No legacy api tokens

    const context = createMockContext('Bearer revoked-jwt');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
