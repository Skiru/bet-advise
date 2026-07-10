import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';
import { S3HealthIndicator } from './s3-health.indicator';
import { SqsHealthIndicator } from './sqs-health.indicator';
import { MiniStackHealthIndicator } from './ministack-health.indicator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbIndicator: TypeOrmHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly s3Indicator: S3HealthIndicator,
    private readonly sqsIndicator: SqsHealthIndicator,
    private readonly miniStackIndicator: MiniStackHealthIndicator,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  getLive() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check' })
  getReady() {
    return this.health.check([
      () => this.dbIndicator.pingCheck('database'),
      () => this.redisIndicator.isHealthy('redis'),
      () => this.s3Indicator.isHealthy('s3'),
      () => this.sqsIndicator.isHealthy('sqs'),
      () => this.miniStackIndicator.isHealthy('ministack'),
    ]);
  }
}
