import { Test, TestingModule } from '@nestjs/testing';
import { LoginHandler } from './login.handler';
import { LoginCommand } from '../commands/login.command';
import { ExternalIntegrationPointServicePortToken } from '../ports/external-integration-point-service.port';
import { RefreshTokenRepositoryPortToken } from '../ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from '../ports/api-token-repository.port';
import { TokenServicePortToken } from '../ports/token-service.port';
import { HashServicePortToken } from '../ports/hash-service.port';
import { CachePortToken } from '../../../shared/application/cache/cache.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { Member } from '../../domain/member.entity';
import { RefreshToken } from '../../domain/refresh-token.entity';
import {
  UserNotFoundError,
  DeviceBindingError,
  AuthenticationError,
} from '../../domain/auth-errors';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let mockExternalService: { findPersonByMobile: jest.Mock };
  let mockRefreshTokenRepo: {
    findLatestByExternalId: jest.Mock;
    save: jest.Mock;
  };
  let mockApiTokenRepo: { deleteByExternalId: jest.Mock; save: jest.Mock };
  let mockTokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
  };
  let mockHashService: {
    generateSalt: jest.Mock;
    sha256: jest.Mock;
    generateRandomToken: jest.Mock;
  };
  let mockCache: { set: jest.Mock };
  let mockAuditApi: { log: jest.Mock };

  beforeEach(async () => {
    mockExternalService = { findPersonByMobile: jest.fn() };
    mockRefreshTokenRepo = {
      findLatestByExternalId: jest.fn(),
      save: jest.fn().mockResolvedValue(null),
    };
    mockApiTokenRepo = {
      deleteByExternalId: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(null),
    };
    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
    };
    mockHashService = {
      generateSalt: jest.fn().mockReturnValue('mock-salt'),
      sha256: jest.fn().mockReturnValue('mock-hash'),
      generateRandomToken: jest.fn().mockReturnValue('mock-legacy-token'),
    };
    mockCache = {
      set: jest.fn().mockResolvedValue(null),
    };
    mockAuditApi = {
      log: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        {
          provide: ExternalIntegrationPointServicePortToken,
          useValue: mockExternalService,
        },
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

    handler = module.get<LoginHandler>(LoginHandler);
  });

  it('should authenticate a valid member and issue tokens', async () => {
    const member = Member.create(
      'm-123',
      'ext-123',
      'Bet365',
      'Bet365',
      '+4511223344',
      false,
    );
    mockExternalService.findPersonByMobile.mockResolvedValue(member);
    mockRefreshTokenRepo.findLatestByExternalId.mockResolvedValue(null);

    const command = new LoginCommand(
      '+45 11 22 33 44',
      'device-123',
      'iPhone',
      'User-Agent-String',
      '127.0.0.1',
    );
    const result = await handler.execute(command);

    expect(mockExternalService.findPersonByMobile).toHaveBeenCalledWith(
      '+4511223344',
    );
    expect(mockRefreshTokenRepo.save).toHaveBeenCalled();
    expect(mockApiTokenRepo.deleteByExternalId).toHaveBeenCalledWith('ext-123');
    expect(mockApiTokenRepo.save).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith(
      'session:active:ext-123',
      true,
      300,
    );
    expect(mockAuditApi.log).toHaveBeenCalledWith(
      'USER_LOGGED_IN',
      'Member',
      'm-123',
      'ext-123',
      { deviceId: 'device-123', ipAddress: '127.0.0.1' },
    );

    expect(result.token).toBe('mock-access-token');
    expect(result.refresh_token).toBe('mock-refresh-token');
    expect(result.tokenExpiry).toBeDefined();
    expect(result.refresh_token_expires_at).toBeDefined();
  });

  it('should throw UserNotFoundError if mobile not registered', async () => {
    mockExternalService.findPersonByMobile.mockResolvedValue(null);

    const command = new LoginCommand(
      '+4500000000',
      'device-123',
      null,
      null,
      null,
    );
    await expect(handler.execute(command)).rejects.toThrow(UserNotFoundError);
  });

  it('should throw AuthenticationError if member isDisabled', async () => {
    const disabledMember = Member.create(
      'm-123',
      'ext-123',
      'Bet365',
      'Bet365',
      '+4511223344',
      true, // disabled
    );
    mockExternalService.findPersonByMobile.mockResolvedValue(disabledMember);

    const command = new LoginCommand(
      '+4511223344',
      'device-123',
      null,
      null,
      null,
    );
    await expect(handler.execute(command)).rejects.toThrow(AuthenticationError);
  });

  it('should throw DeviceBindingError if deviceId does not match latest token', async () => {
    const member = Member.create(
      'm-123',
      'ext-123',
      'Bet365',
      'Bet365',
      '+4511223344',
      false,
    );
    mockExternalService.findPersonByMobile.mockResolvedValue(member);

    const lastToken = RefreshToken.create(
      'jti-old',
      'ext-123',
      'Bet365',
      'm-123',
      'Bet365',
      'device-original', // Mismatch with login device-123
      'salt',
      'hash',
      new Date(),
      new Date(),
    );
    mockRefreshTokenRepo.findLatestByExternalId.mockResolvedValue(lastToken);

    const command = new LoginCommand(
      '+4511223344',
      'device-123',
      null,
      null,
      null,
    );
    await expect(handler.execute(command)).rejects.toThrow(DeviceBindingError);
  });
});
