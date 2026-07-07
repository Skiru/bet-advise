import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CachePort } from '../../application/cache/cache.port';

@Injectable()
export class RedisCacheAdapter implements CachePort, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheAdapter.name);
  private readonly client: Redis;
  private readonly keyPrefix = 'bet-advise:';
  private readonly defaultTtlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 16379;
    const tls = this.configService.get<boolean>('redis.tls') || false;
    this.defaultTtlSeconds =
      this.configService.get<number>('redis.cacheDefaultTtlSeconds') || 300;

    this.client = new Redis({
      host,
      port,
      tls: tls ? {} : undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch (error) {
      this.logger.error('Error during Redis client shutdown:', error);
    }
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    try {
      const data = await this.client.get(fullKey);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${fullKey} from cache:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = ttlSeconds !== undefined ? ttlSeconds : this.defaultTtlSeconds;
    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.set(fullKey, serialized, 'EX', ttl);
      } else {
        await this.client.set(fullKey, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${fullKey} in cache:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    try {
      await this.client.del(fullKey);
    } catch (error) {
      this.logger.error(`Failed to delete key ${fullKey} from cache:`, error);
    }
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      this.logger.error('Redis PING failed:', error);
      throw error;
    }
  }
}
