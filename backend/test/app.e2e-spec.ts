import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { AllExceptionsFilter } from './../src/common/http/all-exceptions.filter.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  it('GET /api returns the API status without authentication', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('API Hệ thống quản lý tour du lịch đang hoạt động!');
  });

  it('GET /api/health is public', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(body.status).toBe('ok');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it.each(['/api/tours', '/api/catalog/categories', '/api/catalog/destinations', '/api/banners/visible', '/api/system/settings/public-info'])(
    'GET %s can read the initialized database without authentication', async (path) => {
      await request(app.getHttpServer()).get(path).expect(200);
    },
  );

  it.each(['/api/auth/me', '/api/tours/admin', '/api/users'])(
    'GET %s still requires authentication', async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
    },
  );

  it('POST /api/auth/login validates input', async () => {
    const { body } = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'invalid' }).expect(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  afterAll(async () => {
    await app?.close();
  });
});
