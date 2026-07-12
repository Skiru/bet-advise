import { Test, TestingModule } from '@nestjs/testing';
import { GenerateAdviceHandler } from './generate-advice.handler';
import { GenerateAdviceCommand } from '../commands/generate-advice.command';
import { ADVICE_REPOSITORY_PORT } from '../ports/advice-repository.port';
import { MATCHES_MODULE_API } from '../../../matches/interfaces/module-api/matches-module.api.interface';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context';

describe('GenerateAdviceHandler', () => {
  let handler: GenerateAdviceHandler;
  let mockAdviceRepository: { createWithOutbox: jest.Mock };
  let mockMatchesApi: { findById: jest.Mock };
  let mockAuditApi: { log: jest.Mock };
  let mockEventBus: { publish: jest.Mock };
  let mockTenantContext: { getTenantId: jest.Mock };

  beforeEach(async () => {
    mockAdviceRepository = {
      createWithOutbox: jest.fn().mockResolvedValue({
        id: 'advice-123',
        matchId: 'match-123',
        market: 'match_winner',
        selection: 'home',
        decision: 'RECOMMENDED',
        rationale: 'Strong form',
      }),
    };

    mockMatchesApi = {
      findById: jest.fn(),
    };

    mockAuditApi = {
      log: jest.fn().mockResolvedValue(null),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    mockTenantContext = {
      getTenantId: jest.fn().mockReturnValue('tenant-123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateAdviceHandler,
        { provide: ADVICE_REPOSITORY_PORT, useValue: mockAdviceRepository },
        { provide: MATCHES_MODULE_API, useValue: mockMatchesApi },
        { provide: AUDIT_MODULE_API, useValue: mockAuditApi },
        { provide: EventBus, useValue: mockEventBus },
        { provide: TenantContext, useValue: mockTenantContext },
      ],
    }).compile();

    handler = module.get<GenerateAdviceHandler>(GenerateAdviceHandler);
  });

  it('should fail when match does not exist', async () => {
    mockMatchesApi.findById.mockResolvedValue(null);

    const command = new GenerateAdviceCommand('match-not-exist');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundDomainError);
    expect(mockAdviceRepository.createWithOutbox).not.toHaveBeenCalled();
    expect(mockAuditApi.log).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should create advice, save outbox/audit, and publish event', async () => {
    mockMatchesApi.findById.mockResolvedValue({
      id: 'match-123',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      status: 'SCHEDULED',
    });

    const command = new GenerateAdviceCommand('match-123');
    const result = await handler.execute(command);

    expect(result.id).toBe('advice-123');
    expect(mockAdviceRepository.createWithOutbox).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match-123',
        market: 'match_winner',
        selection: 'home',
        decision: 'RECOMMENDED',
        rejectionReason: null,
      }),
    );
    expect(mockAuditApi.log).toHaveBeenCalledWith(
      'ADVICE_GENERATED',
      'Advice',
      'advice-123',
      'system',
      expect.any(Object),
    );
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
