import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponDraftEntity } from './infrastructure/entities/coupon-draft.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CouponDraftEntity])],
  exports: [TypeOrmModule],
})
export class CouponsModule {}
