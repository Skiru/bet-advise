/* eslint-disable */
import { SqsMessageQueueAdapter } from './sqs-message-queue.adapter';

describe('SqsMessageQueueAdapter', () => {
  let adapter: SqsMessageQueueAdapter;
  let mockSqsClient: any;

  beforeEach(() => {
    mockSqsClient = {
      send: jest.fn(),
    };
    adapter = new SqsMessageQueueAdapter(mockSqsClient);
  });

  it('should publish single message to SQS successfully', async () => {
    mockSqsClient.send.mockResolvedValue({});
    const body = { test: true };
    const attributes = { eventType: 'TEST_EVENT' };

    await expect(
      adapter.publish('http://sqs.url', body, attributes),
    ).resolves.not.toThrow();
    expect(mockSqsClient.send).toHaveBeenCalled();
  });
});
