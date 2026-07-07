import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateMatchDto {
  @ApiProperty({ example: 'Arsenal' })
  @IsString()
  @IsNotEmpty()
  homeTeam!: string;

  @ApiProperty({ example: 'Chelsea' })
  @IsString()
  @IsNotEmpty()
  awayTeam!: string;

  @ApiProperty({ example: '2026-07-05T20:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  kickoffAt!: string;

  @ApiPropertyOptional({ example: 'ext-arsenal-chelsea' })
  @IsString()
  @IsOptional()
  externalId?: string;
}
