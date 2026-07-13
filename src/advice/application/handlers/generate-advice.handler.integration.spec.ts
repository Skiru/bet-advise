/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import { GenerateAdviceHandler } from './generate-advice.handler';
import { GenerateAdviceCommand } from '../commands/generate-advice.command';
import { ADVICE_REPOSITORY_PORT } from '../ports/advice-repository.port';
import { IAdviceRepository } from '../ports/advice-repository.port';
import { MATCH_REPOSITORY_PORT } from '../../../matches/application/ports/match-repository.port';
import { IMatchRepository } from '../../../matches/application/ports/match-repository.port';
import { DataSource } from 'typeorm';
import { MatchEntity } from '../../../matches/infrastructure/entities/match.entity';
import { AdviceEntity } from '../../infrastructure/entities/advice.entity';
import { OutboxEventEntity } from '../../../outbox/infrastructure/entities/outbox-event.entity';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context';

describe('GenerateAdviceHandler Integration', () => {
  let module: TestingModule;
  let handler: GenerateAdviceHandler;
  let adviceRepository: IAdviceRepository;
  let matchRepository: IMatchRepository;
  let dataSource: DataSource;
  let tenantContext: TenantContext;
  let createdMatchId: string;
  let createdAdviceId: string;

  beforeAll(async () => {
    process.env.SQS_WAIT_TIME_SECONDS = '1';

    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await module.init();

    handler = module.get<GenerateAdviceHandler>(GenerateAdviceHandler);
    adviceRepository = module.get<IAdviceRepository>(ADVICE_REPOSITORY_PORT);
    matchRepository = module.get<IMatchRepository>(MATCH_REPOSITORY_PORT);
    dataSource = module.get<DataSource>(DataSource);
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await tenantContext.run('default', async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          if (createdAdviceId) {
            await queryRunner.manager.delete(OutboxEventEntity, {
              aggregateId: createdAdviceId,
            });
            await queryRunner.manager.delete(AdviceEntity, {
              id: createdAdviceId,
            });
          }
          if (createdMatchId) {
            await queryRunner.manager.delete(MatchEntity, {
              id: createdMatchId,
            });
          }
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
        } finally {
          await queryRunner.release();
        }
      });
    }
    await module.close();
  });

  it('should generate advice and write transactional outbox event for an existing match in database', async () => {
    await tenantContext.run('default', async () => {
      // 1. Create a match in the database first
      const match = await matchRepository.create({
        homeTeam: 'Integration FC',
        awayTeam: 'Advice United',
        kickoffAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        externalId: 'advice-int-' + Date.now(),
      });
      createdMatchId = match.id;

      // 2. Generate advice using the handler
      const command = new GenerateAdviceCommand(match.id);
      const advice = await handler.execute(command);
      createdAdviceId = advice.id;

      // 3. Verify returned advice details
      expect(advice.id).toBeDefined();
      expect(advice.matchId).toBe(match.id);
      expect(advice.market).toBe('match_winner');
      expect(advice.selection).toBe('home');
      expect(advice.decision).toBe('RECOMMENDED');

      // 4. Verify DB persistence for Advice
      const persistedAdvice = await adviceRepository.findById(advice.id);
      expect(persistedAdvice).not.toBeNull();
      expect(persistedAdvice!.matchId).toBe(match.id);

      // 5. Verify transactional OutboxEvent persistence
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      const outboxEvent = await queryRunner.manager.findOne(OutboxEventEntity, {
        where: { aggregateId: advice.id },
      });
      await queryRunner.release();

      expect(outboxEvent).not.toBeNull();
      expect(outboxEvent!.type).toBe('ADVICE_GENERATED');
      expect(outboxEvent!.aggregateType).toBe('Advice');
      expect((outboxEvent!.payload as any).matchId).toBe(match.id);
    });
  });
});
