import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchEntity } from './entities/match.entity';
import { Match } from '../domain/match.entity';
import { MatchStatus } from '../domain/match-status.enum';
import { randomUUID } from 'crypto';
import { IMatchRepository } from '../application/ports/match-repository.port';

@Injectable()
export class TypeOrmMatchRepository implements IMatchRepository {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly repo: Repository<MatchEntity>,
  ) {}

  private mapToDomain(entity: MatchEntity): Match {
    return Match.create(
      entity.id,
      entity.homeTeam,
      entity.awayTeam,
      entity.kickoffAt,
      entity.status as MatchStatus,
      entity.createdAt,
      entity.updatedAt,
      entity.externalId,
    );
  }

  async findById(id: string): Promise<Match | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async findAll(): Promise<Match[]> {
    const entities = await this.repo.find({ order: { kickoffAt: 'ASC' } });
    return entities.map((entity) => this.mapToDomain(entity));
  }

  async create(data: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: Date;
    externalId?: string;
  }): Promise<Match> {
    const entity = this.repo.create({
      id: randomUUID(),
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      kickoffAt: data.kickoffAt,
      externalId: data.externalId || null,
      status: 'SCHEDULED',
    });
    const saved = await this.repo.save(entity);
    return this.mapToDomain(saved);
  }
}
