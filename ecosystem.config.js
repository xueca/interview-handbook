// 文件功能: PM2 生产进程配置 | 数据流: pm2 start ecosystem.config.js → 启动 backend/app.js
module.exports = {
  apps: [
    {
      name: 'interview-handbook-api',
      script: './backend/app.js',
      cwd: '/var/www/interview-handbook',
      instances: 1,           // SSE 有状态长连接，先单实例；后续可改 max 配合 sticky session
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_file: '/var/www/interview-handbook/backend/.env.production',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/interview-handbook-error.log',
      out_file: '/var/log/pm2/interview-handbook-out.log',
      merge_logs: true,
      max_memory_restart: '512M',
      restart_delay: 3000,
      min_uptime: '10s',
      max_restarts: 5,
      kill_timeout: 5000
    }
  ]
}