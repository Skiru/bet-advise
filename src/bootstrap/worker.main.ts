import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');

  // Create NestJS context without HTTP listener
  const app = await NestFactory.createApplicationContext(WorkerAppModule);

  app.enableShutdownHooks();

  logger.log('Worker Runtime successfully started in headless context.');
}

bootstrap().catch((err) => {
  console.error('Fatal Worker startup error:', err);
  process.exit(1);
});
