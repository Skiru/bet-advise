import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GenerateAdviceCommand } from '../commands/generate-advice.command';
import { ADVICE_REPOSITORY_PORT } from '../ports/advice-repository.port';
import type { IAdviceRepository } from '../ports/advice-repository.port';
import { MATCHES_MODULE_API } from '../../../matches/interfaces/module-api/matches-module.api.interface';
import type { IMatchesModuleApi } from '../../../matches/interfaces/module-api/matches-module.api.interface';
import { AUDIT_MODULE_API } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import type { IAuditModuleApi } from '../../../audit/interfaces/module-api/audit-module.api.interface';
import { AdviceGeneratedEvent } from '../../domain/events/advice-generated.event';
import { NotFoundDomainError } from '../../../shared/domain/domain-error';

@CommandHandler(GenerateAdviceCommand)
export class GenerateAdviceHandler implements ICommandHandler<GenerateAdviceCommand> {
  constructor(
    @Inject(ADVICE_REPOSITORY_PORT)
    private readonly adviceRepository: IAdviceRepository,
    @Inject(MATCHES_MODULE_API)
    private readonly matchesApi: IMatchesModuleApi,
    @Inject(AUDIT_MODULE_API)
    private readonly auditApi: IAuditModuleApi,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GenerateAdviceCommand) {
    const match = await this.matchesApi.findById(command.matchId);
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

    await this.auditApi.log('ADVICE_GENERATED', 'Advice', advice.id, 'system', {
      matchId: advice.matchId,
    });

    this.eventBus.publish(new AdviceGeneratedEvent(advice.id, advice.matchId));

    return advice;
  }
}
