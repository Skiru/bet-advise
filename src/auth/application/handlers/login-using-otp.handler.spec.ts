import { Test, TestingModule } from '@nestjs/testing';
import { LoginUsingOtpHandler } from './login-using-otp.handler';
import { LoginUsingOtpCommand } from '../commands/login-using-otp.command';
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
  InvalidOtpError,
  OtpExpiredError,
  DeviceBindingError,
  AuthenticationError,
} from '../../domain/auth-errors';

describe('LoginUsingOtpHandler', () => {
  let handler: LoginUsingOtpHandler;
  let mockExternalIntegrationService: { findPersonByMobile: jest.Mock };
  let mockRefreshTokenRepo: {
    findLatestByExternalId: jest.Mock;
    save: jest.Mock;
  };
  let mockApiTokenRepo: {
    deleteByExternalId: jest.Mock;
    save: jest.Mock;
  };
  let mockTokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
  };
  let mockHashService: {
    sha256: jest.Mock;
    generateSalt: jest.Mock;
    generateRandomToken: jest.Mock;
  };
  let mockCache: { get: jest.Mock; set: jest.Mock; delete: jest.Mock };
  let mockAuditApi: { log: jest.Mock };

  beforeEach(async () => {
    mockExternalIntegrationService = { findPersonByMobile: jest.fn() };
    mockRefreshTokenRepo = {
      findLatestByExternalId: jest.fn(),
      save: jest.fn().mockResolvedValue(null),
    };
    mockApiTokenRepo = {
      deleteByExternalId: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(null),
    };
    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access-jwt-123'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-jwt-123'),
    };
    mockHashService = {
      sha256: jest.fn().mockReturnValue('hashed-jti-abc'),
      generateSalt: jest.fn().mockReturnValue('salt-123'),
      generateRandomToken: jest
        .fn()
        .mockReturnValue('random-legacy-64-chars-abc'),
    };
    mockCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(null),
    };
    mockAuditApi = { log: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUsingOtpHandler,
        {
          provide: ExternalIntegrationPointServicePortToken,
          useValue: mockExternalIntegrationService,
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

    handler = module.get<LoginUsingOtpHandler>(LoginUsingOtpHandler);
  });

  it('should successfully log in and generate tokens when OTP is correct', async () => {
    mockCache.get.mockResolvedValue('1234'); // OTP is correct
    const member = Member.create(
      'ex-123',
      'ext-123',
      'Bet365',
      'Bet365',
      '+4511223344',
    );
    mockExternalIntegrationService.findPersonByMobile.mockResolvedValue(member);
    mockRefreshTokenRepo.findLatestByExternalId.mockResolvedValue(null); // No previous login / device binding

    const command = new LoginUsingOtpCommand(
      '+4511223344',
      '1234',
      'device-123',
      'iPhone 15',
      'UserAgent',
      '127.0.0.1',
    );

    const result = await handler.execute(command);

    expect(result.token).toBe('access-jwt-123');
    expect(result.refresh_token).toBe('refresh-jwt-123');
    expect(result.tokenExpiry).toBeDefined();
    expect(result.refresh_token_expires_at).toBeDefined();

    expect(mockCache.delete).toHaveBeenCalledWith('otp:+4511223344');
    expect(mockRefreshTokenRepo.save).toHaveBeenCalled();
    expect(mockApiTokenRepo.save).toHaveBeenCalled();
    expect(mockAuditApi.log).toHaveBeenCalledWith(
      'USER_LOGGED_IN',
      'Member',
      'ex-123',
      'ext-123',
      { deviceId: 'device-123', ipAddress: '127.0.0.1' },
    );
  });

  it('should throw OtpExpiredError when OTP is not in cache', async () => {
    mockCache.get.mockResolvedValue(null);

    const command = new LoginUsingOtpCommand(
      '+4511223344',
      '1234',
      'device-123',
    );

    await expect(handler.execute(command)).rejects.toThrow(OtpExpiredError);
  });

  it('should throw InvalidOtpError when OTP is incorrect', async () => {
    mockCache.get.mockResolvedValue('4321'); // cached OTP is different

    const command = new LoginUsingOtpCommand(
      '+4511223344',
      '1234',
      'device-123',
    );

    await expect(handler.execute(command)).rejects.toThrow(InvalidOtpError);
  });

  it('should throw AuthenticationError when member is disabled/blacklisted', async () => {
    mockCache.get.mockResolvedValue('1234');
    const member = Member.create(
      'ex-123',
      'ext-123',
      'Bet365',
      'Bet365',
      '+4511223344',
      true,
    ); // disabled
    mockExternalIntegrationService.findPersonByMobile.mockResolvedValue(member);

    const command = new LoginUsingOtpCommand(
      '+4511223344',
      '1234',
      'device-123',
    );

    await expect(handler.execute(command)).rejects.toThrow(AuthenticationError);
  });

  it('should throw DeviceBindingError when deviceId is different from bound device', async () => {
    mockCache.get.mockResolvedValue('1234');
    const member = Member.create(
      'ex-123',
      'ext-123',
      'Bet365',
      'Bet365',
      '+4511223344',
    );
    mockExternalIntegrationService.findPersonByMobile.mockResolvedValue(member);

    const boundToken = RefreshToken.create(
      'token-jti',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'device-another', // bound to another device
      'salt',
      'hash',
      new Date(),
      new Date(Date.now() + 10000),
    );
    mockRefreshTokenRepo.findLatestByExternalId.mockResolvedValue(boundToken);

    const command = new LoginUsingOtpCommand(
      '+4511223344',
      '1234',
      'device-mismatch',
    );

    await expect(handler.execute(command)).rejects.toThrow(DeviceBindingError);
  });
});
