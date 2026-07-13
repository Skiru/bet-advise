/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
export interface TokenServicePort {
  generateAccessToken(payload: Record<string, any>): string;
  generateRefreshToken(payload: Record<string, any>): string;
  verifyToken(token: string): Promise<Record<string, any>>;
}

export const TokenServicePortToken = Symbol('TokenServicePort');
