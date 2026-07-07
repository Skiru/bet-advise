import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { CacheModule } from '../cache/cache.module';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';
import { S3HealthIndicator } from './s3-health.indicator';
import { SqsHealthIndicator } from './sqs-health.indicator';
import { MiniStackHealthIndicator } from './ministack-health.indicator';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, CacheModule],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    S3HealthIndicator,
    SqsHealthIndicator,
    MiniStackHealthIndicator,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
