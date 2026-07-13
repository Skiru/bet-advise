import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OddsEntity } from './infrastructure/entities/odds.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OddsEntity])],
  exports: [TypeOrmModule],
})
export class OddsModule {}
