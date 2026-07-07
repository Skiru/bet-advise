import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateAdviceDto {
  @ApiProperty({ example: 'cm3f8j9x00000pj08yq3w9u3z' })
  @IsString()
  @IsNotEmpty()
  matchId!: string;
}
