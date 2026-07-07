import { Module } from '@nestjs/common';
import { RedisCacheAdapter } from './redis-cache.adapter';
import { CachePortToken } from '../../application/cache/cache.port';

@Module({
  providers: [
    {
      provide: CachePortToken,
      useClass: RedisCacheAdapter,
    },
  ],
  exports: [CachePortToken],
})
export class CacheModule {}
