import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  bucketName: process.env.S3_BUCKET_NAME,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
}));
