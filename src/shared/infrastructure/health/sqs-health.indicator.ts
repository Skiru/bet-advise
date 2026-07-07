import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { SQS_CLIENT } from '../aws/aws-client-tokens';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SqsHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(SQS_CLIENT) private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const queueUrl = this.configService.get<string>('sqs.queueUrl') || '';
    try {
      await this.sqsClient.send(
        new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: ['QueueArn'],
        }),
      );
      return this.getStatus(key, true);
    } catch (error: any) {
      throw new HealthCheckError(
        `SQS check failed for queueUrl: ${queueUrl}`,
        error,
      );
    }
  }
}
