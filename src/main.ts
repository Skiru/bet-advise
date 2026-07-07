import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/interfaces/http/filters/global-exception.filter';
import { CorrelationIdInterceptor } from './shared/interfaces/http/interceptors/correlation-id.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'local';

  // 1. Security Headers via Helmet
  app.use(helmet());

  // 2. Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // 3. CORS Configuration
  if (nodeEnv === 'production') {
    app.enableCors({
      origin: false, // Tighten up origin controls in production as standard practice
      methods: 'GET,POST,DELETE',
      allowedHeaders: 'Content-Type,Authorization,x-correlation-id',
      credentials: true,
    });
  } else {
    app.enableCors({
      origin: '*',
      methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization,x-correlation-id',
    });
  }

  // 4. Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // 5. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // 6. Global Request Correlation ID Interceptor
  app.useGlobalInterceptors(new CorrelationIdInterceptor());

  // 7. Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 8. Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bet Advise API')
    .setDescription('NestJS AWS/MiniStack production-like backend')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  logger.log(`=============================================================`);
  logger.log(
    `  Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(`  Swagger documentation: http://localhost:${port}/docs`);
  logger.log(`  Environment: ${nodeEnv}`);
  logger.log(`=============================================================`);
}
void bootstrap();
