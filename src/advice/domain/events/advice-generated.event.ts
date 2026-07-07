import { DomainEvent } from '../../../shared/domain/domain-event';

export class AdviceGeneratedEvent implements DomainEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly adviceId: string,
    public readonly matchId: string,
  ) {
    this.occurredAt = new Date();
  }
}
