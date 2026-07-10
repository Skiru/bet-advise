import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginUsingOtpDto {
  @ApiProperty({ example: '+4511223344' })
  @IsNotEmpty()
  @IsString()
  mobile!: string;

  @ApiProperty({ example: '1234' })
  @IsNotEmpty()
  @IsString()
  otp!: string;

  @ApiProperty({ example: 'device-123' })
  @IsNotEmpty()
  @IsString()
  deviceId!: string;

  @ApiProperty({ example: 'iPhone 15 Pro, iOS 17.2', required: false })
  @IsOptional()
  @IsString()
  deviceDetails?: string;
}
