/* eslint-disable */
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  SQSClient,
  GetQueueAttributesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { Client } from 'pg';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load environment from .env.local.generated or .env
function loadEnv() {
  const possiblePaths = [
    path.resolve(__dirname, '../../.env.local.generated'),
    path.resolve(__dirname, '../../.env'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim();
          process.env[key] = val;
        }
      });
      console.log(`Loaded configuration from: ${p}`);
      return;
    }
  }
  console.warn(
    'No .env or .env.local.generated found. Using process.env defaults.',
  );
}

loadEnv();

const AWS_ENDPOINT_URL =
  process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'bet-advise-local';
const SQS_EVENTS_QUEUE_URL = process.env.SQS_EVENTS_QUEUE_URL || '';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://admin:pw123456@localhost:15432/bet_advise?schema=public';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '16379', 10);

async function checkMiniStackHttp(): Promise<boolean> {
  try {
    const res = await fetch(`${AWS_ENDPOINT_URL}/_ministack/health`);
    if (res.ok) {
      const data = await res.json();
      console.log('  [PASS] MiniStack HTTP health:', JSON.stringify(data));
      return true;
    }
    console.error(
      `  [FAIL] MiniStack health endpoint returned status ${res.status}`,
    );
  } catch (error) {
    console.error(
      '  [FAIL] MiniStack health endpoint unreachable:',
      (error as Error).message,
    );
  }
  return false;
}

async function testS3(s3: S3Client): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET_NAME }));
    console.log(`  [PASS] S3 HeadBucket: ${S3_BUCKET_NAME}`);

    const testKey = `doctor-test-${Date.now()}.txt`;
    const testBody = 'MINISTACK_DOCTOR_TEST';
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
        Body: testBody,
        ContentType: 'text/plain',
      }),
    );
    console.log(`  [PASS] S3 PutObject: ${testKey}`);

    const getRes = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
      }),
    );
    const bodyString = await getRes.Body?.transformToString();
    if (bodyString !== testBody) {
      throw new Error(
        `Retrieved content mismatch. Expected: ${testBody}, Got: ${bodyString}`,
      );
    }
    console.log(`  [PASS] S3 GetObject: Validated content integrity`);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
      }),
    );
    console.log(`  [PASS] S3 DeleteObject: Cleanup success`);
    return true;
  } catch (error) {
    console.error('  [FAIL] S3 operations failed:', (error as Error).message);
    return false;
  }
}

async function testSQS(sqs: SQSClient): Promise<boolean> {
  if (!SQS_EVENTS_QUEUE_URL) {
    console.error(
      '  [FAIL] SQS: SQS_EVENTS_QUEUE_URL is not set. Please run bootstrap first.',
    );
    return false;
  }
  try {
    const attrRes = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: SQS_EVENTS_QUEUE_URL,
        AttributeNames: ['QueueArn', 'VisibilityTimeout'],
      }),
    );
    console.log(
      `  [PASS] SQS GetQueueAttributes. Queue ARN: ${attrRes.Attributes?.QueueArn}`,
    );

    const testMsgBody = JSON.stringify({ doctor: true, timestamp: Date.now() });
    const sendRes = await sqs.send(
      new SendMessageCommand({
        QueueUrl: SQS_EVENTS_QUEUE_URL,
        MessageBody: testMsgBody,
      }),
    );
    const messageId = sendRes.MessageId;
    console.log(`  [PASS] SQS SendMessage. Message ID: ${messageId}`);

    const receiveRes = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: SQS_EVENTS_QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 5,
      }),
    );
    const messages = receiveRes.Messages || [];
    if (messages.length === 0) {
      throw new Error('No messages received from queue.');
    }
    const receivedMsg = messages[0];
    if (receivedMsg.Body !== testMsgBody) {
      throw new Error(
        `Message body mismatch. Expected: ${testMsgBody}, Got: ${receivedMsg.Body}`,
      );
    }
    console.log(
      `  [PASS] SQS ReceiveMessage: Validated message body integrity`,
    );

    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl: SQS_EVENTS_QUEUE_URL,
        ReceiptHandle: receivedMsg.ReceiptHandle!,
      }),
    );
    console.log(`  [PASS] SQS DeleteMessage: Cleanup success`);
    return true;
  } catch (error) {
    console.error('  [FAIL] SQS operations failed:', (error as Error).message);
    return false;
  }
}

async function testDatabase(): Promise<boolean> {
  const client = new Client({
    connectionString: DATABASE_URL,
  });
  try {
    await client.connect();
    const result = await client.query('SELECT 1 as result');
    if (
      (result.rows &&
        result.rows.length > 0 &&
        result.rows[0].result === '1') ||
      result.rows[0].result === 1
    ) {
      console.log('  [PASS] PostgreSQL SELECT 1 check passed.');
      return true;
    }
    throw new Error('Unexpected query output');
  } catch (error) {
    console.error(
      '  [FAIL] PostgreSQL connection failed:',
      (error as Error).message,
    );
    return false;
  } finally {
    await client.end();
  }
}

async function testRedis(): Promise<boolean> {
  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
  });
  try {
    const pingRes = await redis.ping();
    if (pingRes === 'PONG') {
      console.log(`  [PASS] Redis PING check passed. Port: ${REDIS_PORT}`);
      return true;
    }
    throw new Error(`Unexpected PING reply: ${pingRes}`);
  } catch (error) {
    console.error(
      '  [FAIL] Redis connection check failed:',
      (error as Error).message,
    );
    return false;
  } finally {
    await redis.quit();
  }
}

async function run() {
  console.log('========================================');
  console.log('      MINISTACK DOCTOR REPORT           ');
  console.log('========================================');

  const miniStackOk = await checkMiniStackHttp();

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

  const s3Ok = await testS3(s3);
  const sqsOk = await testSQS(sqs);
  const dbOk = await testDatabase();
  const redisOk = await testRedis();

  console.log('----------------------------------------');
  console.log('VERDICT:');
  const allOk = miniStackOk && s3Ok && sqsOk && dbOk && redisOk;
  if (allOk) {
    console.log('>>> [PASS] ALL SYSTEMS ARE OPERATIONAL <<<');
    console.log('========================================');
    process.exit(0);
  } else {
    console.error('>>> [FAIL] SOME SYSTEMS FAILED CHECKS <<<');
    console.log('========================================');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Doctor script crashed with critical error:', err);
  process.exit(1);
});
