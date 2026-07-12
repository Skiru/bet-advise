/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { SqsConsumerService } from './sqs-consumer.service';

describe('SqsConsumerService', () => {
  let service: SqsConsumerService;
  let mockSqsClient: any;
  let mockConfigService: any;
  let mockInboxRepo: any;
  let mockAudit: any;

  beforeEach(() => {
    mockSqsClient = {
      send: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'sqs.queueUrl') return 'http://sqs.url';
        return undefined;
      }),
    };
    mockInboxRepo = {
      create: jest.fn().mockImplementation((val) => val),
      save: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      }),
    };
    mockAudit = {
      log: jest.fn().mockResolvedValue({}),
    };

    const mockTenantContext = {
      run: (tenantId: string, callback: () => any) => callback(),
      getTenantId: () => 'default',
    };

    service = new SqsConsumerService(
      mockSqsClient,
      mockConfigService,
      mockInboxRepo,
      mockAudit,
      mockTenantContext as any,
    );
  });

  it('should instantiate successfully with config values', () => {
    expect(service).toBeDefined();
  });
});
