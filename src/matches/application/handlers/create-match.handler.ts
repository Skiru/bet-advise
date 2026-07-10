import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateMatchCommand } from '../commands/create-match.command';
import { MATCH_REPOSITORY_PORT } from '../ports/match-repository.port';
import type { IMatchRepository } from '../ports/match-repository.port';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import type { IAuditModuleApi } from '../../../audit/interfaces/module-api/audit-module.api.interface';

@CommandHandler(CreateMatchCommand)
export class CreateMatchHandler implements ICommandHandler<CreateMatchCommand> {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT)
    private readonly repository: IMatchRepository,
    @Inject(AUDIT_MODULE_API)
    private readonly auditApi: IAuditModuleApi,
  ) {}

  async execute(command: CreateMatchCommand) {
    const match = await this.repository.create({
      homeTeam: command.homeTeam,
      awayTeam: command.awayTeam,
      kickoffAt: command.kickoffAt,
      externalId: command.externalId,
    });

    await this.auditApi.log('MATCH_CREATED', 'Match', match.id, 'system', {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    });

    return match;
  }
}
