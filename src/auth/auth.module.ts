import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthController } from './interfaces/http/auth.controller';
import { TokenServicePortToken } from './application/ports/token-service.port';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';

@Module({
  imports: [CqrsModule],
  controllers: [AuthController],
  providers: [
    {
      provide: TokenServicePortToken,
      useClass: JwtTokenService,
    },
  ],
  exports: [TokenServicePortToken],
})
export class AuthModule {}
