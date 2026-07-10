import { Test, TestingModule } from '@nestjs/testing';
import { UpdateOneSignalSubIdHandler } from './update-onesignal.handler';
import { UpdateOneSignalSubIdCommand } from '../commands/update-onesignal.command';
import { RefreshTokenRepositoryPortToken } from '../ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from '../ports/api-token-repository.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { RefreshToken } from '../../domain/refresh-token.entity';
import { ApiToken } from '../../domain/api-token.entity';

describe('UpdateOneSignalSubIdHandler', () => {
  let handler: UpdateOneSignalSubIdHandler;
  let mockRefreshTokenRepo: {
    findActiveByExternalId: jest.Mock;
    findLatestByExternalId: jest.Mock;
    save: jest.Mock;
  };
  let mockApiTokenRepo: { findByExternalId: jest.Mock; save: jest.Mock };
  let mockAuditApi: { log: jest.Mock };

  beforeEach(async () => {
    mockRefreshTokenRepo = {
      findActiveByExternalId: jest.fn(),
      findLatestByExternalId: jest.fn(),
      save: jest.fn().mockResolvedValue(null),
    };
    mockApiTokenRepo = {
      findByExternalId: jest.fn(),
      save: jest.fn().mockResolvedValue(null),
    };
    mockAuditApi = {
      log: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOneSignalSubIdHandler,
        {
          provide: RefreshTokenRepositoryPortToken,
          useValue: mockRefreshTokenRepo,
        },
        { provide: ApiTokenRepositoryPortToken, useValue: mockApiTokenRepo },
        { provide: AUDIT_MODULE_API, useValue: mockAuditApi },
      ],
    }).compile();

    handler = module.get<UpdateOneSignalSubIdHandler>(
      UpdateOneSignalSubIdHandler,
    );
  });

  it('should successfully update OneSignal sub ID on active tokens and legacy API tokens', async () => {
    const activeToken1 = RefreshToken.create(
      'jti-1',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'd-1',
      's1',
      'h1',
      new Date(),
      new Date(),
    );
    const activeToken2 = RefreshToken.create(
      'jti-2',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'd-2',
      's2',
      'h2',
      new Date(),
      new Date(),
    );
    mockRefreshTokenRepo.findActiveByExternalId.mockResolvedValue([
      activeToken1,
      activeToken2,
    ]);
    mockRefreshTokenRepo.findLatestByExternalId.mockResolvedValue(activeToken1);

    const apiToken = ApiToken.create(
      'legacy-token',
      'ext-123',
      'Bet365',
      'ex-123',
      'Bet365',
      'd-1',
      new Date(),
    );
    mockApiTokenRepo.findByExternalId.mockResolvedValue(apiToken);

    const command = new UpdateOneSignalSubIdCommand(
      'ext-123',
      'onesignal-sub-999',
    );
    await handler.execute(command);

    expect(activeToken1.oneSignalSubscriptionId).toBe('onesignal-sub-999');
    expect(activeToken2.oneSignalSubscriptionId).toBe('onesignal-sub-999');
    expect(apiToken.oneSignalSubscriptionId).toBe('onesignal-sub-999');

    expect(mockRefreshTokenRepo.save).toHaveBeenCalledTimes(2);
    expect(mockApiTokenRepo.save).toHaveBeenCalledTimes(1);
    expect(mockAuditApi.log).toHaveBeenCalledWith(
      'ONESIGNAL_UPDATED',
      'Member',
      'ex-123',
      'ext-123',
      { subscriptionId: 'onesignal-sub-999' },
    );
  });
});
