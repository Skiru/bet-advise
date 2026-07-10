export interface TokenServicePort {
  generateAccessToken(payload: Record<string, any>): string;
  generateRefreshToken(payload: Record<string, any>): string;
  verifyToken(token: string): Record<string, any>;
}

export const TokenServicePortToken = Symbol('TokenServicePort');
