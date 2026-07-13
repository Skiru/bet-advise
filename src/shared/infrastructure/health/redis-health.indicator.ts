/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { CachePortToken } from '../../application/cache/cache.port';
import type { CachePort } from '../../application/cache/cache.port';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(CachePortToken)
    private readonly cache: CachePort,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.cache.ping();
      return this.getStatus(key, true);
    } catch (error: any) {
      throw new HealthCheckError('Redis check failed', error);
    }
  }
}
