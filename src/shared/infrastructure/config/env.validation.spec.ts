/* eslint-disable */
import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('should validate valid local config successfully', () => {
    const validLocal = {
      NODE_ENV: 'local',
      AWS_REGION: 'us-east-1',
      S3_BUCKET_NAME: 'test-bucket',
      SQS_EVENTS_QUEUE_NAME: 'test-queue',
      SQS_EVENTS_DLQ_NAME: 'test-queue-dlq',
      DATABASE_URL: 'postgresql://localhost:5432/db',
      REDIS_HOST: 'localhost',
    };
    const { error, value } = envValidationSchema.validate(validLocal);
    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe('local');
  });

  it('should fail validation when critical variables are missing', () => {
    const invalid = {
      NODE_ENV: 'production',
    };
    const { error } = envValidationSchema.validate(invalid);
    expect(error).toBeDefined();
    expect(error?.message).toContain('"AWS_REGION" is required');
  });
});
