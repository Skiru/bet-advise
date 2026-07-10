import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEntity } from './infrastructure/entities/refresh-token.entity';
import { ApiTokenEntity } from './infrastructure/entities/api-token.entity';
import { AuthController } from './interfaces/http/auth.controller';
import { TypeOrmRefreshTokenRepository } from './infrastructure/repositories/typeorm-refresh-token.repository';
import { TypeOrmApiTokenRepository } from './infrastructure/repositories/typeorm-api-token.repository';
import { RefreshTokenRepositoryPortToken } from './application/ports/refresh-token-repository.port';
import { ApiTokenRepositoryPortToken } from './application/ports/api-token-repository.port';
import { ExternalIntegrationPointServicePortToken } from './application/ports/external-integration-point-service.port';
import { MockExternalIntegrationPointService } from './infrastructure/services/mock-external-integration-point.service';
import { TokenServicePortToken } from './application/ports/token-service.port';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';
import { HashServicePortToken } from './application/ports/hash-service.port';
import { Sha256HashService } from './infrastructure/services/sha256-hash.service';
import { CacheModule } from '../shared/infrastructure/cache/cache.module';
import { AuditModule } from '../audit/audit.module';

// Handlers
import { LoginHandler } from './application/handlers/login.handler';
import { RefreshTokenHandler } from './application/handlers/refresh-token.handler';
import { LogoutHandler } from './application/handlers/logout.handler';
import { UpdateOneSignalSubIdHandler } from './application/handlers/update-onesignal.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RefreshTokenEntity, ApiTokenEntity]),
    CacheModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: RefreshTokenRepositoryPortToken,
      useClass: TypeOrmRefreshTokenRepository,
    },
    {
      provide: ApiTokenRepositoryPortToken,
      useClass: TypeOrmApiTokenRepository,
    },
    {
      provide: ExternalIntegrationPointServicePortToken,
      useClass: MockExternalIntegrationPointService,
    },
    {
      provide: TokenServicePortToken,
      useClass: JwtTokenService,
    },
    {
      provide: HashServicePortToken,
      useClass: Sha256HashService,
    },
    // Command Handlers
    LoginHandler,
    RefreshTokenHandler,
    LogoutHandler,
    UpdateOneSignalSubIdHandler,
  ],
  exports: [
    RefreshTokenRepositoryPortToken,
    ApiTokenRepositoryPortToken,
    ExternalIntegrationPointServicePortToken,
    TokenServicePortToken,
    HashServicePortToken,
  ],
})
export class AuthModule {}
