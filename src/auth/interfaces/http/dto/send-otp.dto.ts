import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: '+4511223344',
    description: 'The mobile number of the member',
  })
  @IsNotEmpty()
  @IsString()
  mobile!: string;

  @ApiProperty({ example: 'device-123', description: 'The device identifier' })
  @IsNotEmpty()
  @IsString()
  deviceId!: string;
}
