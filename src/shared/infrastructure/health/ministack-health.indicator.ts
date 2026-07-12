/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MiniStackHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const endpointUrl = this.configService.get<string>('aws.endpointUrl') || '';
    if (
      !endpointUrl.includes('localhost:4566') &&
      !endpointUrl.includes('127.0.0.1:4566')
    ) {
      return this.getStatus(key, true, {
        skipped: 'Skipped - not running locally',
      });
    }

    try {
      const res = await fetch(`${endpointUrl}/_ministack/health`);
      if (res.ok) {
        return this.getStatus(key, true);
      }
      throw new Error(`MiniStack returned HTTP status: ${res.status}`);
    } catch (error: any) {
      throw new HealthCheckError('MiniStack local HTTP check failed', error);
    }
  }
}
