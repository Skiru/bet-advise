/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { GenerateAdviceHandler } from './generate-advice.handler';
import { GenerateAdviceCommand } from '../commands/generate-advice.command';
import { TypeOrmAdviceRepository } from '../../infrastructure/typeorm-advice.repository';
import { TypeOrmMatchRepository } from '../../../matches/infrastructure/typeorm-match.repository';
import { AuditLogService } from '../../../audit/application/audit-log.service';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';

describe('GenerateAdviceHandler', () => {
  let handler: GenerateAdviceHandler;
  let mockAdviceRepository: { createWithOutbox: jest.Mock };
  let mockMatchRepository: { findById: jest.Mock };
  let mockAuditLogService: { log: jest.Mock };
  let mockEventBus: { publish: jest.Mock };

  beforeEach(async () => {
    mockAdviceRepository = {
      createWithOutbox: jest.fn().mockResolvedValue({
        id: 'advice-123',
        matchId: 'match-123',
        market: 'match_winner',
        selection: 'home_or_draw',
        confidence: 62,
        rationale: 'Demo rationale',
        status: 'GENERATED',
      }),
    };

    mockMatchRepository = {
      findById: jest.fn(),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue(null),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateAdviceHandler,
        { provide: TypeOrmAdviceRepository, useValue: mockAdviceRepository },
        { provide: TypeOrmMatchRepository, useValue: mockMatchRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EventBus, useValue: mockEventBus },
      ],
    }).compile();

    handler = module.get<GenerateAdviceHandler>(GenerateAdviceHandler);
  });

  it('should fail when match does not exist', async () => {
    mockMatchRepository.findById.mockResolvedValue(null);

    const command = new GenerateAdviceCommand('match-not-exist');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundDomainError);
    expect(mockAdviceRepository.createWithOutbox).not.toHaveBeenCalled();
    expect(mockAuditLogService.log).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should create advice, save outbox/audit, and publish event', async () => {
    mockMatchRepository.findById.mockResolvedValue({
      id: 'match-123',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
    });

    const command = new GenerateAdviceCommand('match-123');
    const result = await handler.execute(command);

    expect(result.id).toBe('advice-123');
    expect(mockAdviceRepository.createWithOutbox).toHaveBeenCalledWith({
      matchId: 'match-123',
      market: 'match_winner',
      selection: 'home_or_draw',
      confidence: 62,
      rationale: expect.any(String),
    });
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      'ADVICE_GENERATED',
      'Advice',
      'advice-123',
      'system',
      expect.any(Object),
    );
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
