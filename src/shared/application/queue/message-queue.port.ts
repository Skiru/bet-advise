/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
export interface MessageQueuePort {
  publish(
    queueUrl: string,
    body: any,
    attributes?: Record<string, string>,
  ): Promise<void>;

  publishBatch(
    queueUrl: string,
    messages: Array<{
      id: string;
      body: any;
      attributes?: Record<string, string>;
    }>,
  ): Promise<void>;
}

export const MessageQueuePortToken = Symbol('MessageQueuePort');
