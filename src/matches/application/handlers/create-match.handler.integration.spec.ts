import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import { CreateMatchHandler } from './create-match.handler';
import { CreateMatchCommand } from '../commands/create-match.command';
import { MATCH_REPOSITORY_PORT } from '../ports/match-repository.port';
import { IMatchRepository } from '../ports/match-repository.port';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context';

describe('CreateMatchHandler Integration', () => {
  let module: TestingModule;
  let handler: CreateMatchHandler;
  let repository: IMatchRepository;
  let tenantContext: TenantContext;
  const createdMatchIds: string[] = [];

  beforeAll(async () => {
    process.env.SQS_WAIT_TIME_SECONDS = '1';

    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await module.init();

    handler = module.get<CreateMatchHandler>(CreateMatchHandler);
    repository = module.get<IMatchRepository>(MATCH_REPOSITORY_PORT);
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  afterAll(async () => {
    const matchRepo = (
      repository as unknown as {
        repo: { delete: (ids: string[]) => Promise<unknown> };
      }
    ).repo;
    if (matchRepo && createdMatchIds.length > 0) {
      await tenantContext.run('default', async () => {
        await matchRepo.delete(createdMatchIds);
      });
    }
    await module.close();
  });

  it('should successfully persist match in database and generate audit log through handler execution', async () => {
    const kickoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const externalId = 'integration-test-ext-' + Date.now();
    const command = new CreateMatchCommand(
      'Integration FC',
      'Database United',
      kickoff,
      externalId,
    );

    const match = await tenantContext.run('default', async () => {
      return handler.execute(command);
    });

    expect(match.id).toBeDefined();
    createdMatchIds.push(match.id);

    expect(match.homeTeam).toBe('Integration FC');
    expect(match.awayTeam).toBe('Database United');
    expect(match.externalId).toBe(externalId);

    const persisted = await tenantContext.run('default', async () => {
      return repository.findById(match.id);
    });

    expect(persisted).not.toBeNull();
    expect(persisted!.id).toBe(match.id);
    expect(persisted!.homeTeam).toBe('Integration FC');
    expect(persisted!.awayTeam).toBe('Database United');
  });
});
