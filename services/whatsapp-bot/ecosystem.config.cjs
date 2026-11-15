module.exports = {
  apps: [
    {
      name: 'aeggpepp-wa-bot',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '450M',
      watch: false,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
