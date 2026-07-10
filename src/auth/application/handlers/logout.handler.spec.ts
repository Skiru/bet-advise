import { Test, TestingModule } from '@nestjs/testing';
import { LogoutHandler } from './logout.handler';
import { LogoutCommand } from '../commands/logout.command';
import { RefreshTokenRepositoryPortToken } from '../ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from '../ports/api-token-repository.port';
import { TokenServicePortToken } from '../ports/token-service.port';
import { HashServicePortToken } from '../ports/hash-service.port';
import { CachePortToken } from '../../../shared/application/cache/cache.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { RefreshToken } from '../../domain/refresh-token.entity';

describe('LogoutHandler', () => {
  let handler: LogoutHandler;
  let mockRefreshTokenRepo: {
    findByTokenHash: jest.Mock;
    save: jest.Mock;
    revokeAllForExternalId: jest.Mock;
  };
  let mockApiTokenRepo: { deleteByExternalId: jest.Mock };
  let mockTokenService: { verifyToken: jest.Mock };
  let mockHashService: { sha256: jest.Mock };
  let mockCache: { delete: jest.Mock };
  let mockAuditApi: { log: jest.Mock };

  beforeEach(async () => {
    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn(),
      save: jest.fn().mockResolvedValue(null),
      revokeAllForExternalId: jest.fn().mockResolvedValue(null),
    };
    mockApiTokenRepo = {
      deleteByExternalId: jest.fn().mockResolvedValue(null),
    };
    mockTokenService = {
      verifyToken: jest.fn(),
    };
    mockHashService = {
      sha256: jest.fn().mockReturnValue('hash-123'),
    };
    mockCache = {
      delete: jest.fn().mockResolvedValue(null),
    };
    mockAuditApi = {
      log: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutHandler,
        {
          provide: RefreshTokenRepositoryPortToken,
          useValue: mockRefreshTokenRepo,
        },
        { provide: ApiTokenRepositoryPortToken, useValue: mockApiTokenRepo },
        { provide: TokenServicePortToken, useValue: mockTokenService },
        { provide: HashServicePortToken, useValue: mockHashService },
        { provide: CachePortToken, useValue: mockCache },
        { provide: AUDIT_MODULE_API, useValue: mockAuditApi },
      ],
    }).compile();

    handler = module.get<LogoutHandler>(LogoutHandler);
  });

  it('should revoke specific refresh token and clear cache', async () => {
    mockTokenService.verifyToken.mockImplementation((token: string) => {
      if (token === 'access-jwt')
        return { id: 'ex-123', external_id: 'ext-123', type: 'access' };
      if (token === 'refresh-jwt') return { jti: 'jti-123', type: 'refresh' };
      throw new Error();
    });

    const activeToken = RefreshToken.create(
      'jti-123',
      'default',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'device-123',
      'salt-123',
      'hash-123',
      new Date(),
      new Date(Date.now() + 10000),
    );
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(activeToken);

    const command = new LogoutCommand('access-jwt', 'refresh-jwt', false); // logoutAll false
    await handler.execute(command);

    expect(activeToken.isRevoked()).toBe(true);
    expect(activeToken.revokedReason).toBe('logout');
    expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith(activeToken);
    expect(mockCache.delete).toHaveBeenCalledWith(
      'external-integration:member:ext-123',
    );
    expect(mockCache.delete).toHaveBeenCalledWith(
      'external-integration:linked-accounts:ext-123',
    );
    expect(mockAuditApi.log).toHaveBeenCalledWith(
      'USER_LOGGED_OUT',
      'Member',
      'ex-123',
      'ext-123',
      { logoutAll: false },
    );
  });

  it('should revoke all user refresh tokens when logoutAll is true', async () => {
    mockTokenService.verifyToken.mockReturnValue({
      id: 'ex-123',
      external_id: 'ext-123',
      type: 'access',
    });

    const command = new LogoutCommand('access-jwt', null, true); // logoutAll true, no specific refresh
    await handler.execute(command);

    expect(mockRefreshTokenRepo.revokeAllForExternalId).toHaveBeenCalledWith(
      'ext-123',
      'logout_all',
    );
    expect(mockApiTokenRepo.deleteByExternalId).toHaveBeenCalledWith('ext-123');
    expect(mockCache.delete).toHaveBeenCalledWith(
      'external-integration:member:ext-123',
    );
    expect(mockCache.delete).toHaveBeenCalledWith(
      'external-integration:linked-accounts:ext-123',
    );
    expect(mockAuditApi.log).toHaveBeenCalledWith(
      'USER_LOGGED_OUT',
      'Member',
      'ex-123',
      'ext-123',
      { logoutAll: true },
    );
  });
});
