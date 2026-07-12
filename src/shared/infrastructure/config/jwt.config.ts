import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'super-secret',
  issuer: process.env.JWT_ISSUER || 'bet-advise',
  audience: process.env.JWT_AUDIENCE || 'mobile-app',
  jwksUri: process.env.JWT_JWKS_URI || '',
  algorithms: (process.env.JWT_ALGORITHMS || 'RS256,HS256').split(','),
  tenantClaimName: process.env.JWT_TENANT_CLAIM_NAME || 'tenant_id',
  clockSkew: parseInt(process.env.JWT_CLOCK_SKEW || '60', 10),
  jwksCacheDuration: parseInt(
    process.env.JWT_JWKS_CACHE_DURATION || '300000',
    10,
  ),
  accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL || '60m',
}));
