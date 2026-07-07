import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'local')
    .default('local'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),
  APP_NAME: Joi.string().default('bet-advise'),

  AWS_REGION: Joi.string().required(),
  AWS_ENDPOINT_URL: Joi.string().uri().allow('').optional(),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),

  S3_BUCKET_NAME: Joi.string().required(),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(false),

  SQS_EVENTS_QUEUE_NAME: Joi.string().required(),
  SQS_EVENTS_DLQ_NAME: Joi.string().required(),
  SQS_EVENTS_QUEUE_URL: Joi.string().allow('').optional(),
  SQS_EVENTS_DLQ_URL: Joi.string().allow('').optional(),
  SQS_WAIT_TIME_SECONDS: Joi.number().min(0).max(20).default(20),
  SQS_VISIBILITY_TIMEOUT_SECONDS: Joi.number().min(0).default(60),
  SQS_MAX_NUMBER_OF_MESSAGES: Joi.number().min(1).max(10).default(10),
  SQS_CONSUMER_ENABLED: Joi.boolean().default(true),

  DATABASE_URL: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_TLS: Joi.boolean().default(false),
  CACHE_DEFAULT_TTL_SECONDS: Joi.number().integer().min(0).default(300),

  OUTBOX_RELAY_ENABLED: Joi.boolean().default(true),
  OUTBOX_RELAY_INTERVAL_MS: Joi.number().integer().min(100).default(5000),
  OUTBOX_RELAY_BATCH_SIZE: Joi.number().integer().min(1).default(10),
  OUTBOX_RELAY_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
});
