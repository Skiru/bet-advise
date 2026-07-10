/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/shared/interfaces/http/filters/global-exception.filter';

describe('Controllers E2E Tests', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let fileKey: string;

  beforeAll(async () => {
    process.env.SQS_WAIT_TIME_SECONDS = '1';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    if (dataSource.isInitialized) {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('DELETE FROM "refresh_tokens" WHERE "external_id" = $1', ['ext-111']);
        await queryRunner.query('DELETE FROM "api_tokens" WHERE "external_id" = $1', ['ext-111']);
        await queryRunner.commitTransaction();
      } catch {
        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
      }
    }
    await app.close();
  });

  describe('HealthController', () => {
    it('GET /api/health/live', () => {
      return request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('GET /api/health/ready', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('AuthController Flow', () => {
    let otpCode: string;

    it('POST /api/auth/send-otp (should send OTP for valid member)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({
          mobile: '+4511223344',
          deviceId: 'device-test-id',
        })
        .expect(200)
        .then((res) => {
          expect(res.body.mobile).toBe('+4511223344');
          expect(res.body.otp).toBeDefined();
          otpCode = res.body.otp;
        });
    });

    it('POST /api/auth/send-otp (should fail with 400 for invalid member mobile)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/send-otp')
        .send({
          mobile: '+4500000000',
          deviceId: 'device-test-id',
        })
        .expect(400);
    });

    it('POST /api/auth/login-using-otp (should fail with 422 for incorrect OTP)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login-using-otp')
        .send({
          mobile: '+4511223344',
          otp: '9999',
          deviceId: 'device-test-id',
        })
        .expect(422);
    });

    it('POST /api/auth/login-using-otp (should succeed with correct OTP)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login-using-otp')
        .send({
          mobile: '+4511223344',
          otp: otpCode,
          deviceId: 'device-test-id',
          deviceDetails: 'TestRunner Simulator',
        })
        .expect(200)
        .then((res) => {
          expect(res.body.token).toBeDefined();
          expect(res.body.refresh_token).toBeDefined();
          accessToken = res.body.token;
          refreshToken = res.body.refresh_token;
        });
    });

    it('POST /api/auth/refresh-token (should rotate tokens using correct header credentials)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .set('X-Refresh', refreshToken)
        .set('Device-Id', 'device-test-id')
        .expect(200)
        .then((res) => {
          expect(res.body.token).toBeDefined();
          expect(res.body.refresh_token).toBeDefined();
          accessToken = res.body.token;
          refreshToken = res.body.refresh_token;
        });
    });

    it('POST /api/auth/update-onesignal-subid (should succeed when authenticated)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/update-onesignal-subid')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oneSignalSubscriptionId: 'onesignal-sub-test-e2e',
        })
        .expect(200)
        .then((res) => {
          expect(res.body.message).toBe('OneSignal subscription ID updated successfully.');
        });
    });

    it('POST /api/auth/get-avatar (should succeed and demonstrate member ownership guard with direct ownership)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/get-avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          memberId: 'ext-111', // matches external_id of authenticated user
        })
        .expect(200)
        .then((res) => {
          expect(res.body.avatarUrl).toContain('ext-111');
        });
    });

    it('POST /api/auth/get-avatar (should succeed and demonstrate member ownership guard with linked account ownership)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/get-avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          memberId: 'linked-bettor-111', // linked account under ext-111
        })
        .expect(200)
        .then((res) => {
          expect(res.body.avatarUrl).toContain('linked-bettor-111');
        });
    });

    it('POST /api/auth/get-avatar (should fail under ownership guard with mismatched member ID)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/get-avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          memberId: 'ext-222', // belongs to different member
        })
        .expect(403);
    });

    it('POST /api/auth/logout (should invalidate and logout successfully)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Refresh', refreshToken)
        .send({
          logout_all: false,
        })
        .expect(200)
        .then((res) => {
          expect(res.body.message).toBe('Logged out successfully.');
        });
    });
  });

  describe('FilesController Flow', () => {
    it('POST /api/files/demo-upload (should upload file successfully)', () => {
      const fileBuffer = Buffer.from('Integration test file contents');
      return request(app.getHttpServer())
        .post('/api/files/demo-upload')
        .attach('file', fileBuffer, 'e2e-test-doc.txt')
        .expect(201)
        .then((res) => {
          expect(res.body.message).toBe('File uploaded successfully');
          expect(res.body.key).toBeDefined();
          expect(res.body.mimetype).toBe('text/plain');
          fileKey = res.body.key;
        });
    });

    it('GET /api/files/:key/head (should fetch head details of uploaded file)', () => {
      const encodedKey = encodeURIComponent(fileKey);
      return request(app.getHttpServer())
        .get(`/api/files/${encodedKey}/head`)
        .expect(200)
        .then((res) => {
          expect(res.body.metadata).toBeDefined();
          // User-defined metadata keys are normalized to lowercase by S3/MockS3
          expect(res.body.metadata.originalname).toBe('e2e-test-doc.txt');
        });
    });

    it('DELETE /api/files/:key (should delete file successfully)', () => {
      const encodedKey = encodeURIComponent(fileKey);
      return request(app.getHttpServer())
        .delete(`/api/files/${encodedKey}`)
        .expect(204);
    });
  });
});
