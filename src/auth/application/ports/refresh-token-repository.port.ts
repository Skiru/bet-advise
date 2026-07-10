import { RefreshToken } from '../../domain/refresh-token.entity';

export interface RefreshTokenRepositoryPort {
  save(token: RefreshToken): Promise<void>;
  rotate(oldToken: RefreshToken, newToken: RefreshToken): Promise<void>;
  findById(id: string): Promise<RefreshToken | null>;
  findByTokenHash(hash: string): Promise<RefreshToken | null>;
  findActiveByExternalId(externalId: string): Promise<RefreshToken[]>;
  findLatestByExternalId(externalId: string): Promise<RefreshToken | null>;
  revoke(id: string, reason: string): Promise<void>;
  revokeAllForExternalId(externalId: string, reason: string): Promise<void>;
}

export const RefreshTokenRepositoryPortToken = Symbol(
  'RefreshTokenRepositoryPort',
);
