import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { createAuthE2eApp } from './utils/e2e-app.util';

interface Envelope<T> {
  data: T;
  meta: Record<string, unknown>;
  timestamp: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  const credentials = {
    email: 'e2e.student@condupro.test',
    password: 'SecurePass123!',
    firstName: 'E2E',
    lastName: 'Student',
  };

  beforeAll(async () => {
    const setup = await createAuthE2eApp();
    app = setup.app;
    moduleFixture = setup.moduleFixture;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (moduleFixture) {
      await moduleFixture.close();
    }
  });

  it('flujo completo: register → login → me → refresh → logout', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    const registerBody = registerRes.body as Envelope<AuthTokens>;
    expect(registerBody.data.accessToken).toBeDefined();
    expect(registerBody.data.refreshToken).toBeDefined();
    expect(registerBody.timestamp).toBeDefined();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    const loginBody = loginRes.body as Envelope<AuthTokens>;
    const { accessToken, refreshToken } = loginBody.data;

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const meBody = meRes.body as Envelope<{ email: string }>;
    expect(meBody.data.email).toBe(credentials.email.toLowerCase());

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const refreshBody = refreshRes.body as Envelope<AuthTokens>;
    expect(refreshBody.data.accessToken).toBeDefined();
    expect(refreshBody.data.refreshToken).not.toBe(refreshToken);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: refreshBody.data.refreshToken })
      .expect(204);
  });

  it('login con credenciales inválidas retorna 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'WrongPass123!' })
      .expect(401);

    expect(res.body.statusCode).toBe(401);
    expect(res.body.timestamp).toBeDefined();
  });

  it('register duplicado retorna 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        ...credentials,
        email: 'duplicate@condupro.test',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        ...credentials,
        email: 'duplicate@condupro.test',
      })
      .expect(409);

    expect(res.body.statusCode).toBe(409);
  });
});
