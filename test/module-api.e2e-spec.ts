import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { MATCHES_MODULE_API } from '../src/matches/interfaces/module-api/matches-module.api.interface';
import { IMatchesModuleApi } from '../src/matches/interfaces/module-api/matches-module.api.interface';
import { ADVICE_MODULE_API } from '../src/advice/interfaces/module-api/advice-module.api.interface';
import { IAdviceModuleApi } from '../src/advice/interfaces/module-api/advice-module.api.interface';
import { AUDIT_MODULE_API } from '../src/audit/interfaces/module-api/audit-module.api.interface';
import { IAuditModuleApi } from '../src/audit/interfaces/module-api/audit-module.api.interface';
import { MATCH_REPOSITORY_PORT } from '../src/matches/application/ports/match-repository.port';
import { IMatchRepository } from '../src/matches/application/ports/match-repository.port';
import { ADVICE_REPOSITORY_PORT } from '../src/advice/application/ports/advice-repository.port';
import { IAdviceRepository } from '../src/advice/application/ports/advice-repository.port';
import { DataSource } from 'typeorm';
import { MatchEntity } from '../src/matches/infrastructure/entities/match.entity';
import { AdviceEntity } from '../src/advice/infrastructure/entities/advice.entity';
import { OutboxEventEntity } from '../src/outbox/infrastructure/entities/outbox-event.entity';
import { AuditLogEntity } from '../src/audit/infrastructure/entities/audit-log.entity';
import { TenantContext } from '../src/shared/infrastructure/tenant/tenant-context';
import { generateUuidV7 } from '../src/shared/domain/uuid';

describe('Module APIs (e2e)', () => {
  let moduleFixture: TestingModule;
  let matchesApi: IMatchesModuleApi;
  let adviceApi: IAdviceModuleApi;
  let auditApi: IAuditModuleApi;
  let matchRepository: IMatchRepository;
  let adviceRepository: IAdviceRepository;
  let dataSource: DataSource;
  let tenantContext: TenantContext;

  const createdMatchIds: string[] = [];
  const createdAdviceIds: string[] = [];
  const createdAuditLogIds: string[] = [];

  beforeAll(async () => {
    process.env.SQS_WAIT_TIME_SECONDS = '1';

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleFixture.init();

    matchesApi = moduleFixture.get<IMatchesModuleApi>(MATCHES_MODULE_API);
    adviceApi = moduleFixture.get<IAdviceModuleApi>(ADVICE_MODULE_API);
    auditApi = moduleFixture.get<IAuditModuleApi>(AUDIT_MODULE_API);
    matchRepository = moduleFixture.get<IMatchRepository>(
      MATCH_REPOSITORY_PORT,
    );
    adviceRepository = moduleFixture.get<IAdviceRepository>(
      ADVICE_REPOSITORY_PORT,
    );
    dataSource = moduleFixture.get<DataSource>(DataSource);
    tenantContext = moduleFixture.get<TenantContext>(TenantContext);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await tenantContext.run('default', async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          if (createdAdviceIds.length > 0) {
            for (const id of createdAdviceIds) {
              await queryRunner.manager.delete(OutboxEventEntity, {
                aggregateId: id,
              });
              await queryRunner.manager.delete(AdviceEntity, { id });
            }
          }
          if (createdMatchIds.length > 0) {
            for (const id of createdMatchIds) {
              await queryRunner.manager.delete(MatchEntity, { id });
            }
          }
          if (createdAuditLogIds.length > 0) {
            for (const id of createdAuditLogIds) {
              await queryRunner.manager.delete(AuditLogEntity, { id });
            }
          }
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
        } finally {
          await queryRunner.release();
        }
      });
    }
    await moduleFixture.close();
  });

  describe('MatchesModuleApi', () => {
    it('should return null if match is not found', async () => {
      await tenantContext.run('default', async () => {
        const result = await matchesApi.findById(
          '00000000-0000-0000-0000-000000000000',
        );
        expect(result).toBeNull();
      });
    });

    it('should return MatchContractDto for a valid created match', async () => {
      await tenantContext.run('default', async () => {
        const match = await matchRepository.create({
          homeTeam: 'Module Match A',
          awayTeam: 'Module Match B',
          kickoffAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          externalId: 'mod-match-ext-' + Date.now(),
        });
        createdMatchIds.push(match.id);

        const result = await matchesApi.findById(match.id);
        expect(result).not.toBeNull();
        expect(result!.id).toBe(match.id);
        expect(result!.homeTeam).toBe('Module Match A');
        expect(result!.awayTeam).toBe('Module Match B');
        expect(result!.status).toBe('SCHEDULED');
      });
    });
  });

  describe('AdviceModuleApi', () => {
    it('should return empty list if no advice exists for matchId', async () => {
      await tenantContext.run('default', async () => {
        const result = await adviceApi.getAdviceByMatchId(
          '00000000-0000-0000-0000-000000000000',
        );
        expect(result).toEqual([]);
      });
    });

    it('should return AdviceContractDto list for a match with advice', async () => {
      await tenantContext.run('default', async () => {
        // Create a match
        const match = await matchRepository.create({
          homeTeam: 'Advice Match A',
          awayTeam: 'Advice Match B',
          kickoffAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          externalId: 'adv-match-ext-' + Date.now(),
        });
        createdMatchIds.push(match.id);

        // Create advice with our updated port fields
        const advice = await adviceRepository.createWithOutbox({
          id: generateUuidV7(),
          tenantId: 'default',
          matchId: match.id,
          market: 'match_winner',
          selection: 'home',
          decision: 'RECOMMENDED',
          rejectionReason: null,
          expectedValue: 0.12,
          edge: 0.05,
          calibratedProbability: 0.58,
          modelVersion: 'model_v1',
          oddsQuoteId: generateUuidV7(),
          rationale: 'Solid home team stats',
        });
        createdAdviceIds.push(advice.id);

        const result = await adviceApi.getAdviceByMatchId(match.id);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(advice.id);
        expect(result[0].matchId).toBe(match.id);
        expect(result[0].market).toBe('match_winner');
        expect(result[0].selection).toBe('home');
      });
    });
  });

  describe('AuditModuleApi', () => {
    it('should log audit entries directly to database and be verifiable', async () => {
      await tenantContext.run('default', async () => {
        const entityId = 'audit-entity-' + Date.now();
        const payload = { details: 'integration audit verification' };

        const auditLog = await auditApi.log(
          'VERIFY_AUDIT',
          'ModuleVerification',
          entityId,
          'tester',
          payload,
        );

        expect(auditLog).toBeDefined();
        expect(auditLog.id).toBeDefined();
        createdAuditLogIds.push(auditLog.id);

        expect(auditLog.action).toBe('VERIFY_AUDIT');
        expect(auditLog.entityType).toBe('ModuleVerification');
        expect(auditLog.entityId).toBe(entityId);
        expect(auditLog.actor).toBe('tester');
        expect(auditLog.payload).toEqual(payload);

        // Verify DB persistence
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        const dbRecord = await queryRunner.manager.findOne(AuditLogEntity, {
          where: { id: auditLog.id },
        });
        await queryRunner.release();

        expect(dbRecord).not.toBeNull();
        expect(dbRecord!.action).toBe('VERIFY_AUDIT');
        expect(dbRecord!.actor).toBe('tester');
      });
    });
  });
});
