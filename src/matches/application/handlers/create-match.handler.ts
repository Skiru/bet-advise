import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateMatchCommand } from '../commands/create-match.command';
import { TypeOrmMatchRepository } from '../../infrastructure/typeorm-match.repository';
import { AuditLogService } from '../../../audit/application/audit-log.service';

@CommandHandler(CreateMatchCommand)
export class CreateMatchHandler implements ICommandHandler<CreateMatchCommand> {
  constructor(
    private readonly repository: TypeOrmMatchRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: CreateMatchCommand) {
    const match = await this.repository.create({
      homeTeam: command.homeTeam,
      awayTeam: command.awayTeam,
      kickoffAt: command.kickoffAt,
      externalId: command.externalId,
    });

    await this.auditLogService.log(
      'MATCH_CREATED',
      'Match',
      match.id,
      'system',
      { homeTeam: match.homeTeam, awayTeam: match.awayTeam },
    );

    return match;
  }
}
