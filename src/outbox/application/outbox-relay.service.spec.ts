/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { OutboxRelayService } from './outbox-relay.service';

describe('OutboxRelayService', () => {
  let service: OutboxRelayService;
  let mockOutboxRepo: any;
  let mockQueue: any;
  let mockConfig: any;

  beforeEach(() => {
    mockOutboxRepo = {
      update: jest.fn().mockResolvedValue({}),
      manager: {
        transaction: jest.fn().mockImplementation(async (callback) => {
          const mockTxManager = {
            query: jest.fn().mockResolvedValue([]), // no raw rows to lock
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            }),
          };
          return callback(mockTxManager);
        }),
      },
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

  it('should instantiate and describe outbox process gracefully', async () => {
    await service.processOutbox();
    expect(mockOutboxRepo.manager.transaction).toHaveBeenCalled();
  });
});
