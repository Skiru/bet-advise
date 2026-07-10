import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+4511223344' })
  @IsNotEmpty()
  @IsString()
  mobile!: string;

  @ApiProperty({ example: 'device-uuid-123' })
  @IsNotEmpty()
  @IsString()
  deviceId!: string;

  @ApiProperty({ example: 'iPhone 15, iOS 17.4', required: false })
  @IsOptional()
  @IsString()
  deviceDetails?: string;
}
