/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { Principal } from '../../domain/principal.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Retrieve details of the cryptographically verified active session',
  })
  @ApiHeader({ name: 'Authorization', description: 'Bearer access_token' })
  @ApiResponse({ status: 200, description: 'Details of the active principal.' })
  getSession(@CurrentPrincipal() principal: any) {
    return {
      status: 'authenticated',
      principal,
    };
  }
}
