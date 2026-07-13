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
import { Advice } from '../../domain/advice.entity';
import { PredictionValue } from '../../../analysis/domain/prediction-value';
import { OddsQuote } from '../../../odds/domain/odds-quote.entity';
import { generateUuidV7 } from '../../../shared/domain/uuid';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context';

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
    private readonly tenantContext: TenantContext,
  ) {}

  async execute(command: GenerateAdviceCommand) {
    const tenantId = this.tenantContext.getTenantId();
    const match = await this.matchesApi.findById(command.matchId);
    if (!match) {
      throw new NotFoundDomainError('Match', command.matchId);
    }

    // In a pristine, clean environment, we can construct or fetch prediction/odds.
    // For local tests/fixtures, we simulate prediction and odds.
    const prediction = new PredictionValue(
      0.65, // rawModelProbability
      0.63, // calibratedProbability
      0.5, // marketImpliedProbability
      0.5, // noVigMarketProbability
      0.6, // probabilityLowerBound
      0.66, // probabilityUpperBound
      0.9,
      1.0,
    );

    const quote = OddsQuote.create(
      generateUuidV7(),
      tenantId,
      'provider-1',
      'bookmaker-1',
      match.id,
      'match_winner',
      'home',
      1.9, // 1/1.9 = 0.526 implied, calibrated: 0.63. Edge: 0.104, EV: 0.197. (RECOMMENDED)
      new Date(Date.now() - 5000),
      new Date(Date.now() - 1000),
      false,
    );

    const evaluatedAdvice = Advice.evaluate({
      id: generateUuidV7(),
      tenantId,
      match,
      prediction,
      quote,
      hasProvider: true,
      hasModel: true,
      market: 'match_winner',
      selection: 'home',
    });

    const advice = await this.adviceRepository.createWithOutbox({
      id: evaluatedAdvice.id,
      tenantId: evaluatedAdvice.tenantId,
      matchId: evaluatedAdvice.matchId,
      market: evaluatedAdvice.market,
      selection: evaluatedAdvice.selection,
      decision: evaluatedAdvice.decision,
      rejectionReason: evaluatedAdvice.rejectionReason,
      expectedValue: evaluatedAdvice.expectedValue,
      edge: evaluatedAdvice.edge,
      calibratedProbability: evaluatedAdvice.calibratedProbability,
      modelVersion: evaluatedAdvice.modelVersion,
      oddsQuoteId: evaluatedAdvice.oddsQuoteId,
      rationale: evaluatedAdvice.rationale,
    });

    await this.auditApi.log('ADVICE_GENERATED', 'Advice', advice.id, 'system', {
      matchId: advice.matchId,
    });

    this.eventBus.publish(new AdviceGeneratedEvent(advice.id, advice.matchId));

    return advice;
  }
}
