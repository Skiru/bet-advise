import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { ConfigService } from '@nestjs/config';

export const createS3Client = (configService: ConfigService): S3Client => {
  const endpoint = configService.get<string>('aws.endpointUrl');
  const region = configService.get<string>('aws.region') || 'us-east-1';
  const forcePathStyle =
    configService.get<boolean>('s3.forcePathStyle') || false;

  if (endpoint) {
    const accessKeyId = configService.get<string>('aws.accessKeyId') || 'test';
    const secretAccessKey =
      configService.get<string>('aws.secretAccessKey') || 'test';
    return new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle,
    });
  }

  return new S3Client({
    region,
  });
};

export const createSqsClient = (configService: ConfigService): SQSClient => {
  const endpoint = configService.get<string>('aws.endpointUrl');
  const region = configService.get<string>('aws.region') || 'us-east-1';

  if (endpoint) {
    const accessKeyId = configService.get<string>('aws.accessKeyId') || 'test';
    const secretAccessKey =
      configService.get<string>('aws.secretAccessKey') || 'test';
    return new SQSClient({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return new SQSClient({
    region,
  });
};
