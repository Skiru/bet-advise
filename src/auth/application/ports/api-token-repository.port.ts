import { ApiToken } from '../../domain/api-token.entity';

export interface ApiTokenRepositoryPort {
  save(token: ApiToken): Promise<void>;
  findByExternalId(externalId: string): Promise<ApiToken | null>;
  findByToken(token: string): Promise<ApiToken | null>;
  deleteByExternalId(externalId: string): Promise<void>;
}

export const ApiTokenRepositoryPortToken = Symbol('ApiTokenRepositoryPort');
