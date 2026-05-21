import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { AppConfig } from '../config/configuration';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const dbConfig = configService.get('database', { infer: true });
        const nodeEnv = configService.get('nodeEnv', { infer: true });

        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.name,

          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: false,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],

          logging: nodeEnv === 'development' ? ['error', 'warn', 'migration'] : ['error'],
          namingStrategy: undefined,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
