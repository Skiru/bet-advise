import { Test, TestingModule } from '@nestjs/testing';
import { CreateMatchHandler } from './create-match.handler';
import { CreateMatchCommand } from '../commands/create-match.command';
import { TypeOrmMatchRepository } from '../../infrastructure/typeorm-match.repository';
import { AuditLogService } from '../../../audit/application/audit-log.service';

describe('CreateMatchHandler', () => {
  let handler: CreateMatchHandler;
  let mockMatchRepository: { create: jest.Mock };
  let mockAuditLogService: { log: jest.Mock };

  beforeEach(async () => {
    mockMatchRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'match-123',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        kickoffAt: new Date(),
        status: 'SCHEDULED',
        externalId: 'ext-123',
      }),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateMatchHandler,
        { provide: TypeOrmMatchRepository, useValue: mockMatchRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    handler = module.get<CreateMatchHandler>(CreateMatchHandler);
  });

  it('should create a match and save audit log', async () => {
    const kickoff = new Date();
    const command = new CreateMatchCommand(
      'Arsenal',
      'Chelsea',
      kickoff,
      'ext-123',
    );

    const result = await handler.execute(command);

    expect(result.id).toBe('match-123');
    expect(mockMatchRepository.create).toHaveBeenCalledWith({
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      kickoffAt: kickoff,
      externalId: 'ext-123',
    });
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      'MATCH_CREATED',
      'Match',
      'match-123',
      'system',
      expect.any(Object),
    );
  });
});
