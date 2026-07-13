import { NestFactory } from '@nestjs/core';
import { ApiAppModule } from './api.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('ApiBootstrap');
  const app = await NestFactory.create(ApiAppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const prefix = configService.get<string>('API_PREFIX') || 'api';

  // NestJS Security Hardening
  app.use(helmet());
  app.enableCors({
    origin: true, // Configurable in production
    credentials: true,
  });

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`API Runtime successfully started on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal API startup error:', err);
  process.exit(1);
});
