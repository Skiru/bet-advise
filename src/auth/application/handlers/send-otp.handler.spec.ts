import { Test, TestingModule } from '@nestjs/testing';
import { SendOtpHandler } from './send-otp.handler';
import { SendOtpCommand } from '../commands/send-otp.command';
import { ExternalIntegrationPointServicePortToken } from '../ports/external-integration-point-service.port';
import { CachePortToken } from '../../../shared/application/cache/cache.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { UserNotFoundError } from '../../domain/auth-errors';
import { Member } from '../../domain/member.entity';

describe('SendOtpHandler', () => {
  let handler: SendOtpHandler;
  let mockExternalIntegrationService: { findPersonByMobile: jest.Mock };
  let mockCache: { set: jest.Mock };
  let mockAuditApi: { log: jest.Mock };

  beforeEach(async () => {
    mockExternalIntegrationService = {
      findPersonByMobile: jest.fn(),
    };

    mockCache = {
      set: jest.fn().mockResolvedValue(null),
    };

    mockAuditApi = {
      log: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendOtpHandler,
        {
          provide: ExternalIntegrationPointServicePortToken,
          useValue: mockExternalIntegrationService,
        },
        { provide: CachePortToken, useValue: mockCache },
        { provide: AUDIT_MODULE_API, useValue: mockAuditApi },
      ],
    }).compile();

    handler = module.get<SendOtpHandler>(SendOtpHandler);
  });

  it('should successfully generate and save OTP when user exists', async () => {
    const member = Member.create(
      'ex-123',
      'ext-123',
      'Bet365',
      'Bet365',
      '+4511223344',
    );
    mockExternalIntegrationService.findPersonByMobile.mockResolvedValue(member);

    const command = new SendOtpCommand(
      '+4511223344',
      'device-abc',
      'UserAgent',
      '127.0.0.1',
    );
    const result = await handler.execute(command);

    expect(result.mobile).toBe('+4511223344');
    expect(result.otp).toHaveLength(4);
    expect(mockCache.set).toHaveBeenCalledWith(
      'otp:+4511223344',
      result.otp,
      300,
    );
    expect(mockAuditApi.log).toHaveBeenCalledWith(
      'OTP_SENT',
      'Member',
      'ex-123',
      '+4511223344',
      {
        deviceId: 'device-abc',
        userAgent: 'UserAgent',
        ipAddress: '127.0.0.1',
      },
    );
  });

  it('should throw UserNotFoundError when user does not exist in external system', async () => {
    mockExternalIntegrationService.findPersonByMobile.mockResolvedValue(null);

    const command = new SendOtpCommand('+4500000000', 'device-abc');

    await expect(handler.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockCache.set).not.toHaveBeenCalled();
    expect(mockAuditApi.log).not.toHaveBeenCalled();
  });
});
