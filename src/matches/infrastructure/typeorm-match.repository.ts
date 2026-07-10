import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchEntity } from './entities/match.entity';
import { Match } from '../domain/match.entity';
import { generateUuidV7 } from '../../shared/domain/uuid';
import { IMatchRepository } from '../application/ports/match-repository.port';
import { MatchMapper } from './match.mapper';

@Injectable()
export class TypeOrmMatchRepository implements IMatchRepository {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly repo: Repository<MatchEntity>,
    private readonly mapper: MatchMapper,
  ) {}

  async findById(id: string): Promise<Match | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async findAll(): Promise<Match[]> {
    const entities = await this.repo.find({ order: { kickoffAt: 'ASC' } });
    return entities.map((entity) => this.mapper.toDomain(entity));
  }

  async create(data: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: Date;
    externalId?: string;
  }): Promise<Match> {
    const entity = this.repo.create({
      id: generateUuidV7(),
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      kickoffAt: data.kickoffAt,
      externalId: data.externalId || null,
      status: 'SCHEDULED',
    });
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }
}
