import { MatchContractDto } from './dto/match-contract.dto';

export interface IMatchesModuleApi {
  findById(id: string): Promise<MatchContractDto | null>;
}

export const MATCHES_MODULE_API = Symbol('IMatchesModuleApi');
