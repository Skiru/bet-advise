/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenServicePortToken } from '../../../application/ports/token-service.port';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockTokenService: { verifyToken: jest.Mock };
  let mockReflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    mockTokenService = { verifyToken: jest.fn() };
    mockReflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: TokenServicePortToken, useValue: mockTokenService },
        { provide: Reflector, useValue: mockReflector },
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
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should throw UnauthorizedException if Authorization header is missing', async () => {
    const context = createMockContext(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should authorize and attach principal to request if JWT is valid', async () => {
    mockTokenService.verifyToken.mockResolvedValue({
      sub: 'usr-123',
      tenant_id: 'tenant-456',
      scope: 'matches:read advice:read',
    });

    const context = createMockContext('Bearer valid-jwt');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest() as any;
    expect(request.principal).toEqual({
      id: 'usr-123',
      tenantId: 'tenant-456',
      scopes: ['matches:read', 'advice:read'],
      email: undefined,
      roles: undefined,
    });
    expect(request.tenantId).toBe('tenant-456');
  });

  it('should throw UnauthorizedException if token is missing tenant_id claim', async () => {
    mockTokenService.verifyToken.mockResolvedValue({
      sub: 'usr-123',
      scope: 'matches:read',
    });

    const context = createMockContext('Bearer valid-jwt');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    mockTokenService.verifyToken.mockRejectedValue(
      new Error('Verification failed'),
    );

    const context = createMockContext('Bearer invalid-jwt');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should bypass authentication if route is marked public', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true); // marked @Public()

    const context = createMockContext(undefined);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
