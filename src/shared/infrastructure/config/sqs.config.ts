import { registerAs } from '@nestjs/config';

export default registerAs('sqs', () => ({
  queueName: process.env.SQS_EVENTS_QUEUE_NAME,
  dlqName: process.env.SQS_EVENTS_DLQ_NAME,
  queueUrl: process.env.SQS_EVENTS_QUEUE_URL,
  dlqUrl: process.env.SQS_EVENTS_DLQ_URL,
  waitTimeSeconds: parseInt(process.env.SQS_WAIT_TIME_SECONDS || '20', 10),
  visibilityTimeoutSeconds: parseInt(
    process.env.SQS_VISIBILITY_TIMEOUT_SECONDS || '60',
    10,
  ),
  maxNumberOfMessages: parseInt(
    process.env.SQS_MAX_NUMBER_OF_MESSAGES || '10',
    10,
  ),
  consumerEnabled: process.env.SQS_CONSUMER_ENABLED !== 'false',
  outboxRelayEnabled: process.env.OUTBOX_RELAY_ENABLED !== 'false',
  outboxRelayIntervalMs: parseInt(
    process.env.OUTBOX_RELAY_INTERVAL_MS || '5000',
    10,
  ),
  outboxRelayBatchSize: parseInt(
    process.env.OUTBOX_RELAY_BATCH_SIZE || '10',
    10,
  ),
  outboxRelayMaxAttempts: parseInt(
    process.env.OUTBOX_RELAY_MAX_ATTEMPTS || '5',
    10,
  ),
}));
