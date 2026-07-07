import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3_CLIENT, SQS_CLIENT } from './aws-client-tokens';
import { createS3Client, createSqsClient } from './aws-client.factory';

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      useFactory: (configService: ConfigService) =>
        createS3Client(configService),
      inject: [ConfigService],
    },
    {
      provide: SQS_CLIENT,
      useFactory: (configService: ConfigService) =>
        createSqsClient(configService),
      inject: [ConfigService],
    },
  ],
  exports: [S3_CLIENT, SQS_CLIENT],
})
export class AwsClientsModule {}
