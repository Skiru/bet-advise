import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/shared/interfaces/http/filters/global-exception.filter';
import * as jwt from 'jsonwebtoken';

describe('App Endpoints (e2e)', () => {
  let app: INestApplication;
  let testToken: string;

  beforeAll(async () => {
    process.env.SQS_WAIT_TIME_SECONDS = '1';

    testToken = jwt.sign(
      {
        sub: 'usr-123',
        tenant_id: 'default',
        scope: 'matches:read matches:write advice:read advice:write',
        type: 'access',
      },
      'super-secret',
      {
        issuer: 'bet-advise',
        audience: 'mobile-app',
      },
    );

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
    await app.close();
  });

  describe('Root and Health', () => {
    it('GET /api/health/live (should return liveness status)', () => {
      return request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.uptime).toBeDefined();
        });
    });

    it('GET /api/health/ready (should return readiness status)', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.info.database.status).toBe('up');
          expect(res.body.info.redis.status).toBe('up');
          expect(res.body.info.s3.status).toBe('up');
          expect(res.body.info.sqs.status).toBe('up');
        });
    });
  });

  describe('Matches & Advice Lifecycle', () => {
    let createdMatchId: string;
    let createdAdviceId: string;

    it('POST /api/matches (should create a new match)', () => {
      const matchDto = {
        homeTeam: 'Bayern Munich',
        awayTeam: 'Real Madrid',
        kickoffAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        externalId: 'ext-bayern-real-' + Date.now(),
      };

      return request(app.getHttpServer())
        .post('/api/matches')
        .set('Authorization', `Bearer ${testToken}`)
        .send(matchDto)
        .expect(201)
        .then((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.homeTeam).toBe('Bayern Munich');
          expect(res.body.awayTeam).toBe('Real Madrid');
          createdMatchId = res.body.id;
        });
    });

    it('GET /api/matches/:id (should fetch match by ID)', () => {
      return request(app.getHttpServer())
        .get(`/api/matches/${createdMatchId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toBe(createdMatchId);
          expect(res.body.homeTeam).toBe('Bayern Munich');
        });
    });

    it('POST /api/advice/generate (should generate advice for the match)', () => {
      return request(app.getHttpServer())
        .post('/api/advice/generate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ matchId: createdMatchId })
        .expect(201)
        .then((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.matchId).toBe(createdMatchId);
          expect(res.body.market).toBe('match_winner');
          expect(res.body.selection).toBe('home');
          createdAdviceId = res.body.id;
        });
    });

    it('GET /api/advice/:id (should fetch advice by ID)', () => {
      return request(app.getHttpServer())
        .get(`/api/advice/${createdAdviceId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toBe(createdAdviceId);
          expect(res.body.matchId).toBe(createdMatchId);
        });
    });
  });
});
