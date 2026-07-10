import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenHandler } from './refresh-token.handler';
import { RefreshTokenCommand } from '../commands/refresh-token.command';
import { RefreshTokenRepositoryPortToken } from '../ports/refresh-token-repository.port';
import { TokenServicePortToken } from '../ports/token-service.port';
import { HashServicePortToken } from '../ports/hash-service.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { RefreshToken } from '../../domain/refresh-token.entity';
import {
  DeviceBindingError,
  TokenExpiredError,
  TokenRevokedError,
} from '../../domain/auth-errors';

describe('RefreshTokenHandler', () => {
  let handler: RefreshTokenHandler;
  let mockRefreshTokenRepo: {
    findByTokenHash: jest.Mock;
    save: jest.Mock;
    rotate: jest.Mock;
  };
  let mockTokenService: {
    verifyToken: jest.Mock;
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
  };
  let mockHashService: { sha256: jest.Mock; generateSalt: jest.Mock };
  let mockAuditApi: { log: jest.Mock };

  beforeEach(async () => {
    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn(),
      save: jest.fn().mockResolvedValue(null),
      rotate: jest.fn().mockResolvedValue(null),
    };
    mockTokenService = {
      verifyToken: jest.fn().mockReturnValue({
        jti: 'jti-123',
        type: 'refresh',
        external_id: 'ext-123',
      }),
      generateAccessToken: jest.fn().mockReturnValue('new-access-jwt'),
      generateRefreshToken: jest.fn().mockReturnValue('new-refresh-jwt'),
    };
    mockHashService = {
      sha256: jest.fn().mockReturnValue('hash-123'),
      generateSalt: jest.fn().mockReturnValue('new-salt-123'),
    };
    mockAuditApi = { log: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenHandler,
        {
          provide: RefreshTokenRepositoryPortToken,
          useValue: mockRefreshTokenRepo,
        },
        { provide: TokenServicePortToken, useValue: mockTokenService },
        { provide: HashServicePortToken, useValue: mockHashService },
        { provide: AUDIT_MODULE_API, useValue: mockAuditApi },
      ],
    }).compile();

    handler = module.get<RefreshTokenHandler>(RefreshTokenHandler);
  });

  it('should successfully rotate tokens when valid', async () => {
    const activeToken = RefreshToken.create(
      'jti-123',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'device-123',
      'salt-123',
      'hash-123',
      new Date(),
      new Date(Date.now() + 1000 * 60 * 60), // Not expired
    );
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(activeToken);

    const command = new RefreshTokenCommand(
      'valid-refresh-jwt',
      'device-123',
      'UA',
      '127.0.0.1',
    );
    const result = await handler.execute(command);

    expect(result.token).toBe('new-access-jwt');
    expect(result.refresh_token).toBe('new-refresh-jwt');
    expect(mockRefreshTokenRepo.rotate).toHaveBeenCalledTimes(1);
    expect(mockRefreshTokenRepo.rotate).toHaveBeenCalledWith(
      activeToken,
      expect.any(RefreshToken),
    );
    expect(activeToken.isRevoked()).toBe(true);
    expect(activeToken.revokedReason).toBe('rotated');
    expect(mockAuditApi.log).toHaveBeenCalled();
  });

  it('should throw TokenExpiredError if token is expired', async () => {
    const expiredToken = RefreshToken.create(
      'jti-123',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'device-123',
      'salt-123',
      'hash-123',
      new Date(Date.now() - 20000),
      new Date(Date.now() - 10000), // Expired
    );
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(expiredToken);

    const command = new RefreshTokenCommand('valid-refresh-jwt', 'device-123');

    await expect(handler.execute(command)).rejects.toThrow(TokenExpiredError);
  });

  it('should throw TokenRevokedError if token was revoked', async () => {
    const revokedToken = RefreshToken.create(
      'jti-123',
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
    revokedToken.revoke(new Date(), 'logout');
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(revokedToken);

    const command = new RefreshTokenCommand('valid-refresh-jwt', 'device-123');

    await expect(handler.execute(command)).rejects.toThrow(TokenRevokedError);
  });

  it('should throw DeviceBindingError if device does not match', async () => {
    const activeToken = RefreshToken.create(
      'jti-123',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'device-123', // bound to device-123
      'salt-123',
      'hash-123',
      new Date(),
      new Date(Date.now() + 10000),
    );
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(activeToken);

    const command = new RefreshTokenCommand(
      'valid-refresh-jwt',
      'device-mismatch',
    ); // mismatched device

    await expect(handler.execute(command)).rejects.toThrow(DeviceBindingError);
  });
});
