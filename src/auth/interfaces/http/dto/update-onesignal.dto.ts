import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOneSignalSubIdDto {
  @ApiProperty({ example: 'onesignal-sub-id-abc' })
  @IsNotEmpty()
  @IsString()
  oneSignalSubscriptionId!: string;
}
