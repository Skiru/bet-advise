import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './shared/infrastructure/config/app.config';
import databaseConfig from './shared/infrastructure/config/database.config';
import redisConfig from './shared/infrastructure/config/redis.config';
import awsConfig from './shared/infrastructure/config/aws.config';
import s3Config from './shared/infrastructure/config/s3.config';
import sqsConfig from './shared/infrastructure/config/sqs.config';
import { envValidationSchema } from './shared/infrastructure/config/env.validation';

import { AwsClientsModule } from './shared/infrastructure/aws/aws-clients.module';
import { StorageModule } from './shared/infrastructure/storage/storage.module';
import { QueueModule } from './shared/infrastructure/queue/queue.module';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { HealthModule } from './shared/infrastructure/health/health.module';
import { OutboxModule } from './outbox/outbox.module';
import { AuditModule } from './audit/audit.module';
import { MatchesModule } from './matches/matches.module';
import { AdviceModule } from './advice/advice.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
      ],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    AwsClientsModule,
    StorageModule,
    QueueModule,
    CacheModule,
    DatabaseModule,
    HealthModule,
    OutboxModule,
    AuditModule,
    MatchesModule,
    AdviceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
