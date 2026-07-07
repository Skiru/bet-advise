import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AdviceGeneratedEvent } from '../../domain/events/advice-generated.event';
import { Logger } from '@nestjs/common';

@EventsHandler(AdviceGeneratedEvent)
export class AdviceGeneratedEventHandler implements IEventHandler<AdviceGeneratedEvent> {
  private readonly logger = new Logger(AdviceGeneratedEventHandler.name);

  handle(event: AdviceGeneratedEvent) {
    this.logger.log(
      `Local EventBus notification: AdviceGeneratedEvent handled for adviceId ${event.adviceId} of matchId ${event.matchId}`,
    );
  }
}
