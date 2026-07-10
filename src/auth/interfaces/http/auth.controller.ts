/* eslint-disable */
import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { SendOtpDto } from './dto/send-otp.dto';
import { LoginUsingOtpDto } from './dto/login-using-otp.dto';
import { UpdateOneSignalSubIdDto } from './dto/update-onesignal.dto';
import { SendOtpCommand } from '../../application/commands/send-otp.command';
import { LoginUsingOtpCommand } from '../../application/commands/login-using-otp.command';
import { RefreshTokenCommand } from '../../application/commands/refresh-token.command';
import { LogoutCommand } from '../../application/commands/logout.command';
import { UpdateOneSignalSubIdCommand } from '../../application/commands/update-onesignal.command';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MemberOwnershipGuard } from './guards/member-ownership.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a one-time passcode to mobile' })
  @ApiResponse({
    status: 200,
    description: 'OTP successfully generated and stored.',
  })
  async sendOtp(@Body() dto: SendOtpDto, @Req() request: Request) {
    const userAgent = request.headers['user-agent'] || null;
    const ipAddress = request.ip || null;

    return this.commandBus.execute(
      new SendOtpCommand(dto.mobile, dto.deviceId, userAgent, ipAddress),
    );
  }

  @Post('login-using-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login using one-time passcode' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated, JWTs issued.',
  })
  async loginUsingOtp(@Body() dto: LoginUsingOtpDto, @Req() request: Request) {
    const userAgent = request.headers['user-agent'] || null;
    const ipAddress = request.ip || null;

    return this.commandBus.execute(
      new LoginUsingOtpCommand(
        dto.mobile,
        dto.otp,
        dto.deviceId,
        dto.deviceDetails,
        userAgent,
        ipAddress,
      ),
    );
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate JWT tokens using refresh token' })
  @ApiHeader({ name: 'X-Refresh', description: 'The Refresh JWT token' })
  @ApiHeader({
    name: 'Device-Id',
    description: 'The device ID performing the refresh',
  })
  @ApiResponse({ status: 200, description: 'Tokens successfully rotated.' })
  async refreshToken(
    @Headers('X-Refresh') refreshToken: string,
    @Headers('Device-Id') deviceId: string,
    @Req() request: Request,
  ) {
    const userAgent = request.headers['user-agent'] || null;
    const ipAddress = request.ip || null;

    return this.commandBus.execute(
      new RefreshTokenCommand(refreshToken, deviceId, userAgent, ipAddress),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and revoke active session' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer access_token' })
  @ApiHeader({
    name: 'X-Refresh',
    description: 'Optional Refresh token to revoke specifically',
    required: false,
  })
  async logout(
    @Headers('Authorization') authHeader: string,
    @Headers('X-Refresh') refreshToken: string | undefined,
    @Body('logout_all') logoutAll = true,
  ) {
    // Extract access token string
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    await this.commandBus.execute(
      new LogoutCommand(accessToken, refreshToken || null, logoutAll),
    );

    return { message: 'Logged out successfully.' };
  }

  @Post('update-onesignal-subid')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MemberOwnershipGuard)
  @ApiOperation({
    summary: 'Update OneSignal Push Notification Subscription ID',
  })
  async updateOneSignalSubId(
    @CurrentUser('external_id') externalId: string,
    @Body() dto: UpdateOneSignalSubIdDto,
  ) {
    await this.commandBus.execute(
      new UpdateOneSignalSubIdCommand(externalId, dto.oneSignalSubscriptionId),
    );

    return { message: 'OneSignal subscription ID updated successfully.' };
  }

  @Post('get-avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MemberOwnershipGuard)
  @ApiOperation({ summary: 'Retrieve member avatar (Ownership scope demo)' })
  async getAvatar(@Body('memberId') memberId: string) {
    // Just returning a dummy avatar url to demonstrate ownership validation guard
    return { avatarUrl: `https://cdn.bet-advise.com/avatars/${memberId}.png` };
  }
}
