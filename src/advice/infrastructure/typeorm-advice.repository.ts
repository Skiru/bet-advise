import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AdviceEntity } from './entities/advice.entity';
import { OutboxEventEntity } from '../../outbox/infrastructure/entities/outbox-event.entity';
import { Advice } from '../domain/advice.entity';
import { AdviceStatus } from '../domain/advice-status.enum';
import { generateUuidV7 } from '../../shared/domain/uuid';
import { IAdviceRepository } from '../application/ports/advice-repository.port';

@Injectable()
export class TypeOrmAdviceRepository implements IAdviceRepository {
  constructor(
    @InjectRepository(AdviceEntity)
    private readonly repo: Repository<AdviceEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private mapToDomain(entity: AdviceEntity): Advice {
    return Advice.create(
      entity.id,
      entity.matchId,
      entity.market,
      entity.selection,
      entity.confidence,
      entity.rationale,
      entity.status as AdviceStatus,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  async findById(id: string): Promise<Advice | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async findByMatchId(matchId: string): Promise<Advice[]> {
    const entities = await this.repo.find({
      where: { matchId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapToDomain(e));
  }

  async findAll(): Promise<Advice[]> {
    const entities = await this.repo.find({ order: { createdAt: 'DESC' } });
    return entities.map((e) => this.mapToDomain(e));
  }

  async createWithOutbox(data: {
    matchId: string;
    market: string;
    selection: string;
    confidence: number;
    rationale: string;
  }): Promise<Advice> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const adviceId = generateUuidV7();
      const eventId = generateUuidV7();

      const adviceEntity = queryRunner.manager.create(AdviceEntity, {
        id: adviceId,
        matchId: data.matchId,
        market: data.market,
        selection: data.selection,
        confidence: data.confidence,
        rationale: data.rationale,
        status: 'GENERATED',
      });
      const savedAdvice = await queryRunner.manager.save(
        AdviceEntity,
        adviceEntity,
      );

      const outboxEventEntity = queryRunner.manager.create(OutboxEventEntity, {
        id: eventId,
        type: 'ADVICE_GENERATED',
        aggregateType: 'Advice',
        aggregateId: adviceId,
        status: 'PENDING',
        attemptCount: 0,
        payload: {
          adviceId,
          matchId: data.matchId,
          market: data.market,
          selection: data.selection,
          confidence: data.confidence,
        },
      });
      await queryRunner.manager.save(OutboxEventEntity, outboxEventEntity);

      await queryRunner.commitTransaction();
      return this.mapToDomain(savedAdvice);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
