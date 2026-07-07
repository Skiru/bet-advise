import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Advice } from '../../domain/advice.entity';
import { GenerateAdviceDto } from './dto/generate-advice.dto';
import { GenerateAdviceCommand } from '../../application/commands/generate-advice.command';
import { GetAdviceQuery } from '../../application/queries/get-advice.query';
import { ListAdviceQuery } from '../../application/queries/list-advice.query';

@ApiTags('Advice')
@Controller('advice')
export class AdviceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate deterministically mapped advice for a match',
  })
  @ApiResponse({
    status: 201,
    description: 'Advice generated and background job scheduled.',
  })
  async generate(@Body() dto: GenerateAdviceDto): Promise<Advice> {
    return this.commandBus.execute<GenerateAdviceCommand, Advice>(
      new GenerateAdviceCommand(dto.matchId),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all advice (optionally filtered by match ID)' })
  @ApiQuery({
    name: 'matchId',
    required: false,
    description: 'Filter by match ID',
  })
  async findAll(@Query('matchId') matchId?: string): Promise<Advice[]> {
    return this.queryBus.execute<ListAdviceQuery, Advice[]>(
      new ListAdviceQuery(matchId),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get advice by ID' })
  async findOne(@Param('id') id: string): Promise<Advice> {
    return this.queryBus.execute<GetAdviceQuery, Advice>(
      new GetAdviceQuery(id),
    );
  }
}
