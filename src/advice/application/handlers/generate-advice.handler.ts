import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { GenerateAdviceCommand } from '../commands/generate-advice.command';
import { TypeOrmAdviceRepository } from '../../infrastructure/typeorm-advice.repository';
import { TypeOrmMatchRepository } from '../../../matches/infrastructure/typeorm-match.repository';
import { AuditLogService } from '../../../audit/application/audit-log.service';
import { AdviceGeneratedEvent } from '../../domain/events/advice-generated.event';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';

@CommandHandler(GenerateAdviceCommand)
export class GenerateAdviceHandler implements ICommandHandler<GenerateAdviceCommand> {
  constructor(
    private readonly adviceRepository: TypeOrmAdviceRepository,
    private readonly matchRepository: TypeOrmMatchRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GenerateAdviceCommand) {
    const match = await this.matchRepository.findById(command.matchId);
    if (!match) {
      throw new NotFoundDomainError('Match', command.matchId);
    }

    const advice = await this.adviceRepository.createWithOutbox({
      matchId: match.id,
      market: 'match_winner',
      selection: 'home_or_draw',
      confidence: 62,
      rationale:
        'Demo baseline recommendation based on home field advantage and historical trends (deterministic mock).',
    });

    await this.auditLogService.log(
      'ADVICE_GENERATED',
      'Advice',
      advice.id,
      'system',
      { matchId: advice.matchId },
    );

    this.eventBus.publish(new AdviceGeneratedEvent(advice.id, advice.matchId));

    return advice;
  }
}
