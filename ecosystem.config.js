module.exports = {
  apps: [
    {
      name: 'condupro-api',
      script: 'dist/main.js',
      cwd: '/opt/condupro-api',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/condupro-api/error.log',
      out_file: '/var/log/condupro-api/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
