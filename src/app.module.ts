import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { DevThrottlerGuard } from './common/guards/dev-throttler.guard';

import { AssignmentModule } from './assignment/assignment.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './common/health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttle = config.get<{ ttlMs: number; limit: number }>('throttle', { infer: true });
        return [
          {
            name: 'default',
            ttl: throttle?.ttlMs ?? 60_000,
            limit: throttle?.limit ?? 1000,
          },
          {
            name: 'auth-login',
            ttl: 60_000,
            limit: 5,
          },
        ];
      },
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    SchedulingModule,
    AssignmentModule,
    NotificationsModule,
    ReportsModule,
    CurriculumModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: DevThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
