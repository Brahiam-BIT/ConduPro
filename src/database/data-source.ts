import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * DataSource utilizado **únicamente por la CLI de TypeORM** para generar y
 * ejecutar migrations.
 *
 * En runtime la aplicación usa `TypeOrmModule.forRootAsync` definido en
 * `database.module.ts`. Mantenemos ambos en sintonía leyendo las mismas
 * variables de entorno.
 *
 * Uso:
 *   npm run migration:generate -- src/database/migrations/NombreMigracion
 *   npm run migration:run
 *   npm run migration:revert
 */
loadEnv();

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'condupro',
  password: process.env.DATABASE_PASSWORD ?? 'condupro',
  database: process.env.DATABASE_NAME ?? 'condupro',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
