import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AdviceEntity } from './entities/advice.entity';
import { OutboxEventEntity } from '../../outbox/infrastructure/entities/outbox-event.entity';
import { Advice } from '../domain/advice.entity';
import { generateUuidV7 } from '../../shared/domain/uuid';
import { IAdviceRepository } from '../application/ports/advice-repository.port';
import { AdviceMapper } from './advice.mapper';
import { TenantContext } from '../../shared/infrastructure/tenant/tenant-context';

@Injectable()
export class TypeOrmAdviceRepository implements IAdviceRepository {
  constructor(
    @InjectRepository(AdviceEntity)
    private readonly repo: Repository<AdviceEntity>,
    private readonly dataSource: DataSource,
    private readonly mapper: AdviceMapper,
    private readonly tenantContext: TenantContext,
  ) {}

  async findById(id: string): Promise<Advice | null> {
    const entity = await this.repo.findOne({
      where: { id, tenantId: this.tenantContext.getTenantId() },
    });
    if (!entity) return null;
    return this.mapper.toDomain(entity);
  }

  async findByMatchId(matchId: string): Promise<Advice[]> {
    const entities = await this.repo.find({
      where: { matchId, tenantId: this.tenantContext.getTenantId() },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findAll(): Promise<Advice[]> {
    const entities = await this.repo.find({
      where: { tenantId: this.tenantContext.getTenantId() },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async createWithOutbox(data: {
    matchId: string;
    market: string;
    selection: string;
    confidence: number;
    rationale: string;
  }): Promise<Advice> {
    const queryRunner = this.dataSource.createQueryRunner();
    const tenantId = this.tenantContext.getTenantId();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const adviceId = generateUuidV7();
      const eventId = generateUuidV7();

      const adviceEntity = queryRunner.manager.create(AdviceEntity, {
        id: adviceId,
        tenantId,
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
        tenantId,
        type: 'ADVICE_GENERATED',
        aggregateType: 'Advice',
        aggregateId: adviceId,
        status: 'PENDING',
        attemptCount: 0,
        payload: {
          adviceId,
          tenantId,
          matchId: data.matchId,
          market: data.market,
          selection: data.selection,
          confidence: data.confidence,
        },
      });
      await queryRunner.manager.save(OutboxEventEntity, outboxEventEntity);

      await queryRunner.commitTransaction();
      return this.mapper.toDomain(savedAdvice);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
