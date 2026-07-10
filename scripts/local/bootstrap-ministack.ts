/* eslint-disable */
import {
  S3Client,
  CreateBucketCommand,
  PutPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import { RDSClient, CreateDBInstanceCommand } from '@aws-sdk/client-rds';
import {
  ElastiCacheClient,
  CreateCacheClusterCommand,
} from '@aws-sdk/client-elasticache';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

const AWS_ENDPOINT_URL = 'http://localhost:4566';
const AWS_REGION = 'us-east-1';
const BUCKET_NAME = 'bet-advise-local';
const QUEUE_NAME = 'bet-advise-events';
const DLQ_NAME = 'bet-advise-events-dlq';
const DB_HOST = 'localhost';
const DB_PORT = 15432;
const REDIS_HOST = 'localhost';
const REDIS_PORT = 16379;

async function checkMiniStackHealth(): Promise<boolean> {
  console.log('Checking MiniStack health...');
  try {
    const response = await fetch(`${AWS_ENDPOINT_URL}/_ministack/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('MiniStack health status:', JSON.stringify(data));
      return true;
    }
  } catch (error) {
    console.warn(
      'MiniStack health check failed or MiniStack not yet ready:',
      (error as Error).message,
    );
  }
  return false;
}

async function waitTcpPort(
  host: string,
  port: number,
  timeoutMs = 30000,
): Promise<boolean> {
  const start = Date.now();
  console.log(`Waiting for TCP port ${host}:${port}...`);
  while (Date.now() - start < timeoutMs) {
    try {
      const socket = new net.Socket();
      const promise = new Promise<boolean>((resolve) => {
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('error', () => {
          socket.destroy();
          resolve(false);
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
      });
      socket.connect(port, host);
      const isConnected = await promise;
      if (isConnected) {
        console.log(`Port ${host}:${port} is open!`);
        return true;
      }
    } catch {
      // Ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.error(`Timeout waiting for port ${host}:${port}`);
  return false;
}

async function bootstrapS3(s3: S3Client) {
  console.log(`Creating S3 Bucket: ${BUCKET_NAME}...`);
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`S3 Bucket ${BUCKET_NAME} created successfully.`);
  } catch (error: any) {
    if (
      error.name === 'BucketAlreadyExists' ||
      error.name === 'BucketAlreadyOwnedByYou'
    ) {
      console.log(`S3 Bucket ${BUCKET_NAME} already exists.`);
    } else {
      console.error('Error creating S3 bucket:', error);
      throw error;
    }
  }

  console.log(`Setting Block Public Access for ${BUCKET_NAME}...`);
  try {
    await s3.send(
      new PutPublicAccessBlockCommand({
        Bucket: BUCKET_NAME,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
    console.log(
      `Public access block configured successfully (Private-by-default).`,
    );
  } catch (error) {
    console.warn(
      '[MINISTACK_FIDELITY_GAP] BlockPublicAccess setting might not be fully supported by MiniStack, skipping. Error:',
      (error as Error).message,
    );
  }
}

async function bootstrapSQS(sqs: SQSClient) {
  console.log(`Creating SQS DLQ: ${DLQ_NAME}...`);
  let dlqUrl = '';
  try {
    const res = await sqs.send(
      new CreateQueueCommand({
        QueueName: DLQ_NAME,
        Attributes: {
          MessageRetentionPeriod: '1209600', // 14 days
        },
      }),
    );
    dlqUrl = res.QueueUrl || '';
    console.log(`DLQ created at URL: ${dlqUrl}`);
  } catch (error) {
    console.error('Error creating SQS DLQ:', error);
    throw error;
  }

  // Get DLQ Arn for redrive policy
  let dlqArn = '';
  try {
    const attributesRes = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: dlqUrl,
        AttributeNames: ['QueueArn'],
      }),
    );
    dlqArn = attributesRes.Attributes?.QueueArn || '';
    console.log(`DLQ Arn: ${dlqArn}`);
  } catch (error) {
    console.warn(
      '[MINISTACK_FIDELITY_GAP] Failed to get DLQ Arn via GetQueueAttributes, generating fallback ARN.',
    );
    dlqArn = `arn:aws:sqs:${AWS_REGION}:000000000000:${DLQ_NAME}`;
  }

  console.log(
    `Creating SQS Queue: ${QUEUE_NAME} with RedrivePolicy pointing to DLQ...`,
  );
  let queueUrl = '';
  try {
    const res = await sqs.send(
      new CreateQueueCommand({
        QueueName: QUEUE_NAME,
        Attributes: {
          VisibilityTimeout: '60',
          ReceiveMessageWaitTimeSeconds: '20', // Long polling
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: dlqArn,
            maxReceiveCount: 5,
          }),
        },
      }),
    );
    queueUrl = res.QueueUrl || '';
    console.log(`Queue created at URL: ${queueUrl}`);
  } catch (error) {
    console.error('Error creating SQS queue:', error);
    throw error;
  }

  return { queueUrl, dlqUrl };
}

async function bootstrapRDS(rds: RDSClient) {
  console.log('Provisioning RDS PostgreSQL instance...');
  try {
    await rds.send(
      new CreateDBInstanceCommand({
        DBInstanceIdentifier: 'bet-advise-db',
        Engine: 'postgres',
        DBInstanceClass: 'db.t3.micro',
        MasterUsername: 'admin',
        MasterUserPassword: 'pw123456',
        DBName: 'bet_advise',
        AllocatedStorage: 20,
      }),
    );
    console.log('RDS PostgreSQL instance creation initiated successfully.');
  } catch (error: any) {
    if (
      error.name?.includes('AlreadyExists') ||
      error.Code?.includes('AlreadyExists') ||
      error.message?.includes('already exists') ||
      error.message?.includes('AlreadyExists')
    ) {
      console.log('RDS PostgreSQL instance already exists.');
    } else {
      console.error('Error provisioning RDS:', error);
      throw error;
    }
  }
}

async function bootstrapElastiCache(elasticache: ElastiCacheClient) {
  console.log('Provisioning ElastiCache Redis cluster...');
  try {
    await elasticache.send(
      new CreateCacheClusterCommand({
        CacheClusterId: 'bet-advise-redis',
        Engine: 'redis',
        CacheNodeType: 'cache.t3.micro',
        NumCacheNodes: 1,
      }),
    );
    console.log('ElastiCache Redis cluster creation initiated successfully.');
  } catch (error: any) {
    if (
      error.name?.includes('AlreadyExists') ||
      error.Code?.includes('AlreadyExists') ||
      error.message?.includes('already exists') ||
      error.message?.includes('AlreadyExists')
    ) {
      console.log('ElastiCache Redis cluster already exists.');
    } else {
      console.error('Error provisioning ElastiCache:', error);
      throw error;
    }
  }
}

async function run() {
  console.log('--- MINISTACK BOOTSTRAP START ---');

  // 1. Wait for MiniStack to be up
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    if (await checkMiniStackHealth()) {
      healthy = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!healthy) {
    console.error(
      'MiniStack is not healthy or accessible on port 4566. Please start it using "pnpm local:up"',
    );
    process.exit(1);
  }

  // 2. Setup AWS clients
  const s3 = new S3Client({
    endpoint: AWS_ENDPOINT_URL,
    region: AWS_REGION,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    forcePathStyle: true,
  });

  const sqs = new SQSClient({
    endpoint: AWS_ENDPOINT_URL,
    region: AWS_REGION,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  const rds = new RDSClient({
    endpoint: AWS_ENDPOINT_URL,
    region: AWS_REGION,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  const elasticache = new ElastiCacheClient({
    endpoint: AWS_ENDPOINT_URL,
    region: AWS_REGION,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  // 3. Provision S3
  await bootstrapS3(s3);

  // 4. Provision SQS
  const { queueUrl, dlqUrl } = await bootstrapSQS(sqs);

  // 5. Provision RDS & ElastiCache
  await bootstrapRDS(rds);
  await bootstrapElastiCache(elasticache);

  // 6. Wait for Database & Redis TCP Ports
  const isDbReady = await waitTcpPort(DB_HOST, DB_PORT);
  const isRedisReady = await waitTcpPort(REDIS_HOST, REDIS_PORT);

  if (!isDbReady || !isRedisReady) {
    console.error(
      'Failed to connect to database or Redis. MiniStack containers might not be fully operational.',
    );
    process.exit(1);
  }

  // 7. Generate .env.local.generated
  const envContent = `NODE_ENV=local
APP_NAME=bet-advise
PORT=3000
API_PREFIX=api

AWS_REGION=${AWS_REGION}
AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL}
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

S3_BUCKET_NAME=${BUCKET_NAME}
S3_FORCE_PATH_STYLE=true

SQS_EVENTS_QUEUE_NAME=${QUEUE_NAME}
SQS_EVENTS_DLQ_NAME=${DLQ_NAME}
SQS_EVENTS_QUEUE_URL=${queueUrl}
SQS_EVENTS_DLQ_URL=${dlqUrl}
SQS_WAIT_TIME_SECONDS=20
SQS_VISIBILITY_TIMEOUT_SECONDS=60
SQS_MAX_NUMBER_OF_MESSAGES=10
SQS_CONSUMER_ENABLED=true

DATABASE_URL=postgresql://admin:pw123456@localhost:15432/bet_advise?schema=public
DATABASE_SSL=false

REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_TLS=false
CACHE_DEFAULT_TTL_SECONDS=300

OUTBOX_RELAY_ENABLED=true
OUTBOX_RELAY_INTERVAL_MS=5000
OUTBOX_RELAY_BATCH_SIZE=10
OUTBOX_RELAY_MAX_ATTEMPTS=5
`;

  const targetPath = path.resolve(__dirname, '../../.env.local.generated');

  if (fs.existsSync(targetPath)) {
    console.log(
      `Backing up existing .env.local.generated to .env.local.generated.bak`,
    );
    fs.copyFileSync(targetPath, `${targetPath}.bak`);
  }

  fs.writeFileSync(targetPath, envContent, 'utf-8');
  console.log(
    `.env.local.generated file written successfully at ${targetPath}`,
  );

  // Create or update symlink or copy to .env for convenience if .env doesn't exist
  const mainEnvPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(mainEnvPath)) {
    console.log(
      'Copying .env.local.generated to .env since no .env file was found.',
    );
    fs.copyFileSync(targetPath, mainEnvPath);
  }

  console.log('--- MINISTACK BOOTSTRAP COMPLETE ---');
}

run().catch((err) => {
  console.error('Bootstrap failed with critical error:', err);
  process.exit(1);
});
