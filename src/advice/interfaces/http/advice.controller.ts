import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Advice } from '../../domain/advice.entity';
import { GenerateAdviceDto } from './dto/generate-advice.dto';
import { GenerateAdviceCommand } from '../../application/commands/generate-advice.command';
import { GetAdviceQuery } from '../../application/queries/get-advice.query';
import { ListAdviceQuery } from '../../application/queries/list-advice.query';
import { RequirePermissions } from '../../../auth/interfaces/http/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../../auth/interfaces/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/interfaces/http/guards/permissions.guard';

@ApiTags('Advice')
@Controller('advice')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiHeader({ name: 'Authorization', description: 'Bearer access_token' })
export class AdviceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('generate')
  @RequirePermissions('advice:write')
  @ApiOperation({
    summary: 'Generate sports advice for a match using prediction models',
  })
  @ApiResponse({
    status: 201,
    description: 'Advice successfully evaluated and persisted.',
  })
  async generate(@Body() dto: GenerateAdviceDto): Promise<Advice> {
    return this.commandBus.execute<GenerateAdviceCommand, Advice>(
      new GenerateAdviceCommand(dto.matchId),
    );
  }

  @Get()
  @RequirePermissions('advice:read')
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
  @RequirePermissions('advice:read')
  @ApiOperation({ summary: 'Get advice by ID' })
  async findOne(@Param('id') id: string): Promise<Advice> {
    return this.queryBus.execute<GetAdviceQuery, Advice>(
      new GetAdviceQuery(id),
    );
  }
}
