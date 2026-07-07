/* eslint-disable */
import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
} from '@aws-sdk/client-sqs';
import { MessageQueuePort } from '../../application/queue/message-queue.port';
import { SQS_CLIENT } from '../aws/aws-client-tokens';

@Injectable()
export class SqsMessageQueueAdapter implements MessageQueuePort {
  private readonly logger = new Logger(SqsMessageQueueAdapter.name);

  constructor(@Inject(SQS_CLIENT) private readonly sqsClient: SQSClient) {}

  async publish(
    queueUrl: string,
    body: any,
    attributes?: Record<string, string>,
  ): Promise<void> {
    this.logger.debug(`Publishing message to SQS: ${queueUrl}`);
    const messageAttributes: any = {};

    if (attributes) {
      Object.entries(attributes).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          messageAttributes[key] = {
            DataType: 'String',
            StringValue: String(val),
          };
        }
      });
    }

    try {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: bodyString,
          MessageAttributes: messageAttributes,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish message to SQS queue ${queueUrl}:`,
        error,
      );
      throw error;
    }
  }

  async publishBatch(
    queueUrl: string,
    messages: Array<{
      id: string;
      body: any;
      attributes?: Record<string, string>;
    }>,
  ): Promise<void> {
    if (messages.length === 0) return;
    this.logger.debug(
      `Publishing batch of ${messages.length} messages to SQS: ${queueUrl}`,
    );

    try {
      const entries = messages.map((msg) => {
        const bodyString =
          typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body);
        const messageAttributes: any = {};

        if (msg.attributes) {
          Object.entries(msg.attributes).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              messageAttributes[key] = {
                DataType: 'String',
                StringValue: String(val),
              };
            }
          });
        }

        return {
          Id: msg.id,
          MessageBody: bodyString,
          MessageAttributes: messageAttributes,
        };
      });

      // Split into batches of max 10 messages (AWS SQS batch limit)
      const chunks: any[][] = [];
      for (let i = 0; i < entries.length; i += 10) {
        chunks.push(entries.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        await this.sqsClient.send(
          new SendMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: chunk,
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to publish batch of messages to SQS queue ${queueUrl}:`,
        error,
      );
      throw error;
    }
  }
}
