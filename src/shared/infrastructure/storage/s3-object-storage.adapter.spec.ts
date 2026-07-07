/* eslint-disable */
import { S3ObjectStorageAdapter } from './s3-object-storage.adapter';

describe('S3ObjectStorageAdapter', () => {
  let adapter: S3ObjectStorageAdapter;
  let mockS3Client: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockS3Client = {
      send: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 's3.bucketName') return 'test-bucket';
        return undefined;
      }),
    };
    adapter = new S3ObjectStorageAdapter(mockS3Client, mockConfigService);
  });

  it('should reject unsafe key with path traversal', async () => {
    await expect(adapter.putObject('../../file.txt', 'body')).rejects.toThrow(
      'Unsafe object key path detected.',
    );
  });

  it('should upload object with valid normalized key', async () => {
    mockS3Client.send.mockResolvedValue({});
    await expect(
      adapter.putObject('\\uploads\\file.txt', 'body'),
    ).resolves.not.toThrow();
    expect(mockS3Client.send).toHaveBeenCalled();
  });
});
