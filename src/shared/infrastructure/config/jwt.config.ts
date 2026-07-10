import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'super-secret',
  issuer: process.env.JWT_ISSUER || 'bet-advise',
  audience: process.env.JWT_AUDIENCE || 'mobile-app',
  accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL || '60m',
  refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL || '365d',
}));
