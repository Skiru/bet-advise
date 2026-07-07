import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly typeOrm: TypeOrmHealthIndicator) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    return this.typeOrm.pingCheck(key);
  }
}
