import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdviceEntity } from './infrastructure/entities/advice.entity';
import { MatchesModule } from '../matches/matches.module';
import { TypeOrmAdviceRepository } from './infrastructure/typeorm-advice.repository';
import { ADVICE_REPOSITORY_PORT } from './application/ports/advice-repository.port';
import { GenerateAdviceHandler } from './application/handlers/generate-advice.handler';
import { GetAdviceHandler } from './application/handlers/get-advice.handler';
import { ListAdviceHandler } from './application/handlers/list-advice.handler';
import { AdviceGeneratedEventHandler } from './application/events/advice-generated.event-handler';
import { AdviceController } from './interfaces/http/advice.controller';
import { ADVICE_MODULE_API } from './interfaces/module-api/advice-module.api.interface';
import { AdviceModuleApi } from './interfaces/module-api/advice-module.api';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([AdviceEntity]),
    MatchesModule,
  ],
  controllers: [AdviceController],
  providers: [
    {
      provide: ADVICE_REPOSITORY_PORT,
      useClass: TypeOrmAdviceRepository,
    },
    {
      provide: ADVICE_MODULE_API,
      useClass: AdviceModuleApi,
    },
    GenerateAdviceHandler,
    GetAdviceHandler,
    ListAdviceHandler,
    AdviceGeneratedEventHandler,
  ],
  exports: [ADVICE_REPOSITORY_PORT, ADVICE_MODULE_API],
})
export class AdviceModule {}
