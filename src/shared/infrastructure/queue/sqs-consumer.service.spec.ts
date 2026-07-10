/* eslint-disable */
import { SqsConsumerService } from './sqs-consumer.service';

describe('SqsConsumerService', () => {
  let service: SqsConsumerService;
  let mockSqsClient: any;
  let mockConfigService: any;
  let mockPrisma: any;
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
    mockPrisma = {
      processedMessage: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    mockAudit = {
      log: jest.fn().mockResolvedValue({}),
    };

    const mockTenantContext = {
      run: (tenantId: string, callback: () => any) => callback(),
      getTenantId: () => 'default',
    };

    const mockPublicIntegration = {
      sendAdviceGenerated: jest.fn().mockResolvedValue(undefined),
    };

    service = new SqsConsumerService(
      mockSqsClient,
      mockConfigService,
      mockPrisma,
      mockAudit,
      mockTenantContext as any,
      mockPublicIntegration as any,
    );
  });

  it('should instantiate successfully with config values', () => {
    expect(service).toBeDefined();
  });
});
