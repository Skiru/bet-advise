import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

// Zero-dependency local .env loader for CLI tool usage
const envPath = path.join(__dirname, '/../../../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      // Remove surrounding quotes if present
      const cleanValue = value.replace(/^['"]|['"]$/g, '');
      process.env[key] = cleanValue;
    }
  }
}

const url = process.env.DATABASE_URL;
const ssl = process.env.DATABASE_SSL === 'true';
const caCert = process.env.DATABASE_CA_CERT || '';

if (!url) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url,
  ssl: ssl
    ? {
        rejectUnauthorized: true,
        ca: caCert ? caCert : undefined,
      }
    : false,
  entities: [path.join(__dirname, '/../../../../**/*.entity{.ts,.js}')],
  subscribers: [path.join(__dirname, '/../../../../**/*.subscriber{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
  synchronize: false,
  logging:
    process.env.NODE_ENV !== 'production' ? ['query', 'error'] : ['error'],
  extra: {
    min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    max: process.env.DATABASE_POOL_MAX
      ? parseInt(process.env.DATABASE_POOL_MAX, 10)
      : 10,
    connectionTimeoutMillis: parseInt(
      process.env.DATABASE_CONNECTION_TIMEOUT || '10000',
      10,
    ),
    statement_timeout: parseInt(
      process.env.DATABASE_STATEMENT_TIMEOUT || '5000',
      10,
    ),
    lock_timeout: parseInt(process.env.DATABASE_LOCK_TIMEOUT || '2000', 10),
    idle_in_transaction_session_timeout: parseInt(
      process.env.DATABASE_IDLE_IN_TRANSACTION_TIMEOUT || '10000',
      10,
    ),
    application_name: 'bet-advise-backend',
  },
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
