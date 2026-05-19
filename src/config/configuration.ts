export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  smtp: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  };
};

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'],
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    name: process.env.DATABASE_NAME ?? 'condupro',
    user: process.env.DATABASE_USER ?? 'condupro',
    password: process.env.DATABASE_PASSWORD ?? 'condupro',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
});
