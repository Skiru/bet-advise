import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Match } from '../../domain/match.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchCommand } from '../../application/commands/create-match.command';
import { GetMatchQuery } from '../../application/queries/get-match.query';
import { ListMatchesQuery } from '../../application/queries/list-matches.query';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new match' })
  @ApiResponse({
    status: 201,
    description: 'The match has been successfully created.',
  })
  async create(@Body() dto: CreateMatchDto): Promise<Match> {
    return this.commandBus.execute<CreateMatchCommand, Match>(
      new CreateMatchCommand(
        dto.homeTeam,
        dto.awayTeam,
        new Date(dto.kickoffAt),
        dto.externalId,
      ),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all matches' })
  async findAll(): Promise<Match[]> {
    return this.queryBus.execute<ListMatchesQuery, Match[]>(
      new ListMatchesQuery(),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a match by ID' })
  async findOne(@Param('id') id: string): Promise<Match> {
    return this.queryBus.execute<GetMatchQuery, Match>(new GetMatchQuery(id));
  }
}
