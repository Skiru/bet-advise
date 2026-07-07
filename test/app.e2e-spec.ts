/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/shared/interfaces/http/filters/global-exception.filter';

describe('App Endpoints (e2e)', () => {
  let app: INestApplication;

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
    await app.close();
  });

  describe('Root and Health', () => {
    it('GET /api (should greet)', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
    });

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
        .expect(200)
        .then((res) => {
          expect(res.body.id).toBe(createdMatchId);
          expect(res.body.homeTeam).toBe('Bayern Munich');
        });
    });

    it('POST /api/advice/generate (should generate advice for the match)', () => {
      return request(app.getHttpServer())
        .post('/api/advice/generate')
        .send({ matchId: createdMatchId })
        .expect(201)
        .then((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.matchId).toBe(createdMatchId);
          expect(res.body.market).toBe('match_winner');
          expect(res.body.selection).toBe('home_or_draw');
          createdAdviceId = res.body.id;
        });
    });

    it('GET /api/advice/:id (should fetch advice by ID)', () => {
      return request(app.getHttpServer())
        .get(`/api/advice/${createdAdviceId}`)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toBe(createdAdviceId);
          expect(res.body.matchId).toBe(createdMatchId);
        });
    });
  });
});
