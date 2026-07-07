/* eslint-disable */
import { OutboxRelayService } from './outbox-relay.service';

describe('OutboxRelayService', () => {
  let service: OutboxRelayService;
  let mockOutboxRepo: { find: jest.Mock; update: jest.Mock };
  let mockQueue: any;
  let mockConfig: any;

  beforeEach(() => {
    mockOutboxRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    };
    mockQueue = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'sqs.outboxRelayEnabled') return true;
        if (key === 'sqs.queueUrl') return 'http://sqs.url';
        return undefined;
      }),
    };
    service = new OutboxRelayService(
      mockOutboxRepo as any,
      mockQueue as any,
      mockConfig as any,
    );
  });

  it('should process pending outbox events successfully', async () => {
    const mockEvent = {
      id: 'event-1',
      type: 'ADVICE_GENERATED',
      aggregateType: 'Advice',
      aggregateId: 'advice-1',
      payload: { value: 123 },
      createdAt: new Date(),
      attemptCount: 0,
    };
    mockOutboxRepo.find.mockResolvedValue([mockEvent]);

    await service.processOutbox();

    expect(mockQueue.publish).toHaveBeenCalled();
    expect(mockOutboxRepo.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({ status: 'PUBLISHED' }),
    );
  });
});
