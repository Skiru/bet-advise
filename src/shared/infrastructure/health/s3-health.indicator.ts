import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { S3_CLIENT } from '../aws/aws-client-tokens';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const bucketName = this.configService.get<string>('s3.bucketName') || '';
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      return this.getStatus(key, true);
    } catch (error: any) {
      throw new HealthCheckError(
        `S3 check failed for bucket: ${bucketName}`,
        error,
      );
    }
  }
}
