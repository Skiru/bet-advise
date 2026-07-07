export interface ObjectStoragePort {
  putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<void>;

  getObject(key: string): Promise<{
    body: Buffer;
    contentType?: string;
    metadata?: Record<string, string>;
  }>;

  deleteObject(key: string): Promise<void>;

  headObject(
    key: string,
  ): Promise<{ contentType?: string; metadata?: Record<string, string> }>;
}

export const ObjectStoragePortToken = Symbol('ObjectStoragePort');
