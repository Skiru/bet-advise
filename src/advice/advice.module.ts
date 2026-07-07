import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdviceEntity } from './infrastructure/entities/advice.entity';
import { MatchesModule } from '../matches/matches.module';
import { TypeOrmAdviceRepository } from './infrastructure/typeorm-advice.repository';
import { GenerateAdviceHandler } from './application/handlers/generate-advice.handler';
import { GetAdviceHandler } from './application/handlers/get-advice.handler';
import { ListAdviceHandler } from './application/handlers/list-advice.handler';
import { AdviceGeneratedEventHandler } from './application/events/advice-generated.event-handler';
import { AdviceController } from './interfaces/http/advice.controller';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([AdviceEntity]),
    MatchesModule,
  ],
  controllers: [AdviceController],
  providers: [
    TypeOrmAdviceRepository,
    GenerateAdviceHandler,
    GetAdviceHandler,
    ListAdviceHandler,
    AdviceGeneratedEventHandler,
  ],
})
export class AdviceModule {}
