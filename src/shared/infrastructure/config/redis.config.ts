import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '16379', 10),
  tls: process.env.REDIS_TLS === 'true',
  cacheDefaultTtlSeconds: parseInt(
    process.env.CACHE_DEFAULT_TTL_SECONDS || '300',
    10,
  ),
}));
