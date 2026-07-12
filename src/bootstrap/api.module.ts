import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import appConfig from '../shared/infrastructure/config/app.config';
import databaseConfig from '../shared/infrastructure/config/database.config';
import redisConfig from '../shared/infrastructure/config/redis.config';
import awsConfig from '../shared/infrastructure/config/aws.config';
import s3Config from '../shared/infrastructure/config/s3.config';
import sqsConfig from '../shared/infrastructure/config/sqs.config';
import jwtConfig from '../shared/infrastructure/config/jwt.config';
import { envValidationSchema } from '../shared/infrastructure/config/env.validation';

import { AwsClientsModule } from '../shared/infrastructure/aws/aws-clients.module';
import { StorageModule } from '../shared/infrastructure/storage/storage.module';
import { CacheModule } from '../shared/infrastructure/cache/cache.module';
import { DatabaseModule } from '../shared/infrastructure/database/database.module';
import { TenantModule } from '../shared/infrastructure/tenant/tenant.module';
import { TenantMiddleware } from '../shared/infrastructure/tenant/tenant.middleware';
import { HealthModule } from '../shared/infrastructure/health/health.module';
import { AuditModule } from '../audit/audit.module';
import { MatchesModule } from '../matches/matches.module';
import { AdviceModule } from '../advice/advice.module';
import { CouponsModule } from '../coupons/coupons.module';
import { AuthModule } from '../auth/auth.module';

import { JwtAuthGuard } from '../auth/interfaces/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/interfaces/http/guards/permissions.guard';
import { GlobalExceptionFilter } from '../shared/interfaces/http/filters/global-exception.filter';
import { CorrelationIdInterceptor } from '../shared/interfaces/http/interceptors/correlation-id.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        awsConfig,
        s3Config,
        sqsConfig,
        jwtConfig,
      ],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    AwsClientsModule,
    StorageModule,
    CacheModule,
    DatabaseModule,
    TenantModule,
    HealthModule,
    AuditModule,
    MatchesModule,
    AdviceModule,
    CouponsModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
  ],
})
export class ApiAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
