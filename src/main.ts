import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('port', { infer: true });
  const nodeEnv = configService.get('nodeEnv', { infer: true });

  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ConduPro API')
    .setDescription('API REST de la plataforma de gestión para escuelas de conducción.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token JWT emitido por /auth/login',
      },
      'access-token',
    )
    .addTag('auth', 'Autenticación y gestión de sesión')
    .addTag('users', 'Gestión de usuarios')
    .addTag('scheduling', 'Agendamiento de clases')
    .addTag('assignment', 'Motor de asignación automática')
    .addTag('notifications', 'Notificaciones y recordatorios')
    .addTag('reports', 'Reportes y métricas')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
    },
  });

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`ConduPro API listening on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  logger.log(`Environment: ${nodeEnv}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
