import { AdviceContractDto } from './dto/advice-contract.dto';

export interface IAdviceModuleApi {
  getAdviceByMatchId(matchId: string): Promise<AdviceContractDto[]>;
}

export const ADVICE_MODULE_API = Symbol('IAdviceModuleApi');
