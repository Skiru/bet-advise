import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { MatchEntity } from '../../../matches/infrastructure/entities/match.entity';
import { AdviceEntity } from '../../../advice/infrastructure/entities/advice.entity';
import { AuditLogEntity } from '../../../audit/infrastructure/entities/audit-log.entity';
import { OutboxEventEntity } from '../../../outbox/infrastructure/entities/outbox-event.entity';
import { ProcessedMessageEntity } from '../queue/entities/processed-message.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const env = configService.get<string>('app.nodeEnv');
        const isLocal = env === 'local' || env === 'test';
        const url = configService.get<string>('database.url');
        const ssl = configService.get<boolean>('database.ssl') || false;

        return {
          type: 'postgres',
          url,
          ssl: ssl ? { rejectUnauthorized: false } : false,
          entities: [
            MatchEntity,
            AdviceEntity,
            AuditLogEntity,
            OutboxEventEntity,
            ProcessedMessageEntity,
          ],
          synchronize: isLocal, // Auto schema synchronization only locally on MiniStack
          logging: isLocal ? ['query', 'error'] : ['error'],
          keepConnectionAlive: true,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      MatchEntity,
      AdviceEntity,
      AuditLogEntity,
      OutboxEventEntity,
      ProcessedMessageEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
