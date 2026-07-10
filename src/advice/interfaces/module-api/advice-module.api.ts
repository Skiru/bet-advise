import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { IAdviceModuleApi } from './advice-module.api.interface';
import { AdviceContractDto } from './dto/advice-contract.dto';
import { ListAdviceQuery } from '../../application/queries/list-advice.query';
import { Advice } from '../../domain/advice.entity';

@Injectable()
export class AdviceModuleApi implements IAdviceModuleApi {
  constructor(private readonly queryBus: QueryBus) {}

  async getAdviceByMatchId(matchId: string): Promise<AdviceContractDto[]> {
    try {
      const advices = await this.queryBus.execute<ListAdviceQuery, Advice[]>(
        new ListAdviceQuery(matchId),
      );
      return advices.map(
        (a) =>
          new AdviceContractDto(
            a.id,
            a.matchId,
            a.market,
            a.selection,
            a.confidence,
            a.rationale,
            a.status,
          ),
      );
    } catch {
      return [];
    }
  }
}
