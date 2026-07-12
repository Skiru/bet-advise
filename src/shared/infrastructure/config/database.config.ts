import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true',
  caCert: process.env.DATABASE_CA_CERT || '',
  poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  connectionTimeout: parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || '10000',
    10,
  ),
  statementTimeout: parseInt(
    process.env.DATABASE_STATEMENT_TIMEOUT || '5000',
    10,
  ),
  lockTimeout: parseInt(process.env.DATABASE_LOCK_TIMEOUT || '2000', 10),
  idleInTransactionTimeout: parseInt(
    process.env.DATABASE_IDLE_IN_TRANSACTION_TIMEOUT || '10000',
    10,
  ),
}));
