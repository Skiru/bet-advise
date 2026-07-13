import { Module } from '@nestjs/common';
import { S3ObjectStorageAdapter } from './s3-object-storage.adapter';
import { ObjectStoragePortToken } from '../../application/storage/object-storage.port';

@Module({
  providers: [
    {
      provide: ObjectStoragePortToken,
      useClass: S3ObjectStorageAdapter,
    },
  ],
  exports: [ObjectStoragePortToken],
})
export class StorageModule {}
