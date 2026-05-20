import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { INestApplication } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';

import { AuthModule } from '../../src/auth/auth.module';
import { LoginAttempt } from '../../src/auth/entity/login-attempt.entity';
import { RefreshToken } from '../../src/auth/entity/refresh-token.entity';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { User } from '../../src/users/entity/user.entity';
import { UsersModule } from '../../src/users/users.module';

loadEnv();

export async function createAuthE2eApp(): Promise<{
  app: INestApplication;
  moduleFixture: TestingModule;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            nodeEnv: 'test',
            port: 3000,
            jwt: {
              secret: process.env.JWT_SECRET ?? 'test-jwt-secret-key-32-chars-min',
              refreshSecret:
                process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-key-32-chars',
              expiresIn: '15m',
              refreshExpiresIn: '7d',
            },
            smtp: {},
          }),
        ],
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
        username: process.env.DATABASE_USER ?? 'condupro',
        password: process.env.DATABASE_PASSWORD ?? 'condupro',
        database: process.env.DATABASE_NAME ?? 'condupro',
        entities: [User, RefreshToken, LoginAttempt],
        synchronize: true,
        dropSchema: true,
      }),
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
      UsersModule,
      AuthModule,
    ],
    providers: [
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  await app.init();

  return { app, moduleFixture };
}
