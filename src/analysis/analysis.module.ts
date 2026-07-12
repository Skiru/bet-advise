import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelEntity } from './infrastructure/entities/model.entity';
import { AnalysisRunEntity } from './infrastructure/entities/analysis-run.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ModelEntity, AnalysisRunEntity])],
  exports: [TypeOrmModule],
})
export class AnalysisModule {}
