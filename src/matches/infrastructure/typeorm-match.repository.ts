import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchEntity } from './entities/match.entity';
import { Match } from '../domain/match.entity';
import { generateUuidV7 } from '../../shared/domain/uuid';
import { IMatchRepository } from '../application/ports/match-repository.port';
import { MatchMapper } from './match.mapper';
import { TenantContext } from '../../shared/infrastructure/tenant/tenant-context';

@Injectable()
export class TypeOrmMatchRepository implements IMatchRepository {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly repo: Repository<MatchEntity>,
    private readonly mapper: MatchMapper,
    private readonly tenantContext: TenantContext,
  ) {}

  async findById(id: string): Promise<Match | null> {
    const entity = await this.repo.findOne({
      where: { id, tenantId: this.tenantContext.getTenantId() },
    });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async findAll(): Promise<Match[]> {
    const entities = await this.repo.find({
      where: { tenantId: this.tenantContext.getTenantId() },
      order: { scheduledStart: 'ASC' },
    });
    return entities.map((entity) => this.mapper.toDomain(entity));
  }

  async create(data: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: Date;
    externalId?: string;
    sport?: string;
    competition?: string;
    participants?: string[];
  }): Promise<Match> {
    const entity = this.repo.create({
      id: generateUuidV7(),
      tenantId: this.tenantContext.getTenantId(),
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      scheduledStart: data.kickoffAt,
      externalId: data.externalId || null,
      status: 'SCHEDULED',
      sport: data.sport || 'soccer',
      competition: data.competition || 'default-league',
      participants: data.participants || [],
    });
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }
}
