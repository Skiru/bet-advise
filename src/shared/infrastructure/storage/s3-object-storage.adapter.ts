/* eslint-disable @typescript-eslint/no-explicit-any */ // Narrowly scoped lint exception for TypeORM/AWS SQS JSONB dynamic payload mappings
import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { ObjectStoragePort } from '../../application/storage/object-storage.port';
import { S3_CLIENT } from '../aws/aws-client-tokens';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly logger = new Logger(S3ObjectStorageAdapter.name);
  private readonly bucketName: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('s3.bucketName') || '';
    if (!this.bucketName) {
      throw new Error('S3_BUCKET_NAME is not configured.');
    }
  }

  private validateAndNormalizeKey(key: string): string {
    if (key.includes('../') || key.includes('..\\')) {
      throw new Error('Unsafe object key path detected.');
    }

    let normalized = key.replace(/\\/g, '/');
    while (normalized.startsWith('/')) {
      normalized = normalized.slice(1);
    }

    if (normalized.length > 1024) {
      throw new Error('Object key length exceeds S3 limits.');
    }

    if (!normalized) {
      throw new Error('Object key cannot be empty.');
    }

    return normalized;
  }

  async putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const cleanKey = this.validateAndNormalizeKey(key);
    this.logger.debug(`Uploading object to S3. Key: ${cleanKey}`);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
          Body: body,
          ContentType: contentType,
          Metadata: metadata,
        }),
      );
    } catch (error) {
      this.logger.error(`S3 PutObject failed for key ${cleanKey}:`, error);
      throw error;
    }
  }

  async getObject(key: string): Promise<{
    body: Buffer;
    contentType?: string;
    metadata?: Record<string, string>;
  }> {
    const cleanKey = this.validateAndNormalizeKey(key);
    this.logger.debug(`Retrieving object from S3. Key: ${cleanKey}`);

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        }),
      );

      if (!response.Body) {
        throw new Error('S3 object body is empty.');
      }

      const bodyBuffer = await this.streamToBuffer(response.Body as Readable);

      return {
        body: bodyBuffer,
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`S3 GetObject failed for key ${cleanKey}:`, error);
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    const cleanKey = this.validateAndNormalizeKey(key);
    this.logger.debug(`Deleting object from S3. Key: ${cleanKey}`);

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        }),
      );
    } catch (error) {
      this.logger.error(`S3 DeleteObject failed for key ${cleanKey}:`, error);
      throw error;
    }
  }

  async headObject(
    key: string,
  ): Promise<{ contentType?: string; metadata?: Record<string, string> }> {
    const cleanKey = this.validateAndNormalizeKey(key);
    this.logger.debug(`Retrieving metadata (head) from S3. Key: ${cleanKey}`);

    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        }),
      );

      return {
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`S3 HeadObject failed for key ${cleanKey}:`, error);
      throw error;
    }
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
