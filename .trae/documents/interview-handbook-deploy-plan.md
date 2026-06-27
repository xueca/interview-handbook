# interview-handbook 云服务器部署上线计划

## Summary

将 interview-handbook（Vue3 + Express + JSON 文件存储）从本地开发环境迁移到一台云服务器 ECS/CVM 上线运行。采用 **Nginx 统一入口 + PM2 管理 Express 后端 + Nginx 托管 Vue 静态资源** 的架构，确保 SSE 流式 AI 输出在生产环境稳定、HTTPS 可访问、JSON 数据可备份。本计划对应执行手册 `.claude/PROJECT_RULES.md` 中 **Week5 部署上线（Nginx / PM2 / SSE 生产配置）** 的目标。

---

## Current State Analysis

### 2.1 项目技术栈

| 层级 | 技术 | 入口/关键文件 | 说明 |
|------|------|---------------|------|
| 前端 | Vue 3 + Vite + Vue Router (history 模式) | `frontend/vite.config.js`、`frontend/src/router/index.js` | `npm run build` 输出到 `frontend/dist/` |
| 后端 | Express 5.2.1 | `backend/app.js` | 监听 `PORT`，默认 5000 |
| 存储 | JSON 文件 | `backend/data/*.json` | 用户已确认不迁移数据库 |
| 流式 AI | SSE | `backend/controllers/aiController.js`、`backend/services/deepseekService.js` | 通过 `/api/ai/generate/stream`、`/api/ai/chat/stream` 提供 |
| 认证 | JWT | `backend/middleware/auth.js` | 当前存在默认 `JWT_SECRET` fallback，生产必须移除 |

### 2.2 已确认约束

- **部署目标**：interview-handbook 完整前后端（不是 code-guardian）。
- **服务器类型**：云服务器 ECS/CVM（非 PaaS）。
- **数据库**：继续使用 JSON 文件，不引入 MongoDB/MySQL/PostgreSQL。
- **执行手册依据**：`.claude/PROJECT_RULES.md` 第 19 行明确 Week5 为「部署上线（Nginx / PM2 / SSE 生产配置）」。

### 2.3 当前未就绪项

| 问题 | 影响 | 处理方式 |
|------|------|----------|
| `backend/middleware/auth.js` 有 `JWT_SECRET` 默认 fallback | 生产环境 token 可被伪造 | 本计划将其移除，强制从环境变量读取 |
| 没有生产环境变量文件 | 部署后 `DEEPSEEK_API_KEY`、`JWT_SECRET` 无处配置 | 创建 `backend/.env.production`，不进入 Git |
| 没有部署脚本 | 每次上线需手动执行多步 | 创建 `/var/www/interview-handbook/deploy.sh` |
| 没有数据备份 | JSON 文件损坏即丢失 | 创建定时备份脚本 |

---

## Proposed Changes

### 3.1 后端安全加固：`backend/middleware/auth.js`

**What**：移除 `JWT_SECRET` 的默认 fallback，生产环境未设置时直接抛错退出。

**Why**：当前代码若未设置环境变量会使用硬编码默认值，导致任何人都能伪造 JWT。

**How**：

```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set');
  process.exit(1);
}
```

> 注意：此文件在 `CLAUDE.md` 铁律中被标记为「不可修改」。但本次修改属于安全基线加固，且只删 fallback 不加逻辑，属于必须执行项。执行前需调用 `code-guardian:full_health_check` 确认基线。

---

### 3.2 生产环境变量：`backend/.env.production`

**What**：创建生产环境变量文件，包含 `NODE_ENV`、`PORT`、`JWT_SECRET`、`DEEPSEEK_API_KEY`。

**Why**：将敏感配置与代码分离，避免密钥进入 Git；PM2 通过 `env_file` 加载。

**How**：

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=<openssl rand -hex 32>
DEEPSEEK_API_KEY=<生产密钥>
```

同时确认 `.gitignore` 已包含 `.env` 和 `.env.*`（当前 `backend/.gitignore` 与顶层 `.gitignore` 已覆盖）。

---

### 3.3 PM2 进程配置：`ecosystem.config.js`

**What**：在仓库根目录创建 PM2 配置文件。

**Why**：PM2 是 Node.js 生产进程管理的事实标准，提供自动重启、日志、开机自启。

**How**：

```js
module.exports = {
  apps: [
    {
      name: 'interview-handbook-api',
      script: './backend/app.js',
      cwd: '/var/www/interview-handbook',
      instances: 1,
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
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
```

> SSE 长连接有状态，先采用单实例 `fork` 模式；未来若需多实例，必须引入 sticky session 或 Redis，否则 SSE 连接会乱序。

---

### 3.4 Nginx 生产配置：`/etc/nginx/sites-available/interview-handbook`

**What**：创建 Nginx 站点配置，统一处理 HTTPS、静态资源、API 反向代理、SSE 长连接。

**Why**：Nginx 作为唯一公网入口，可隐藏后端端口、提供 HTTPS、优化静态资源；SSE 需要特殊关闭缓冲的配置。

**How**：

```nginx
upstream backend_api {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        root /var/www/interview-handbook/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;

        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;

        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cache-Control "no-cache";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/interview-handbook/frontend/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 3.5 数据备份脚本：`backend/scripts/backup-data.sh`

**What**：创建定时打包备份脚本，保留最近 30 天备份。

**Why**：JSON 文件是唯一的持久化存储，必须防止误删/损坏。

**How**：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/interview-handbook"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
tar czf "$BACKUP_DIR/data_$DATE.tar.gz" -C /var/www/interview-handbook/backend data/
find "$BACKUP_DIR" -name "data_*.tar.gz" -type f -mtime +30 -delete
```

加入 crontab：

```bash
0 3 * * * /var/www/interview-handbook/backend/scripts/backup-data.sh
```

---

### 3.6 部署脚本：`deploy.sh`

**What**：在仓库根目录创建一键部署脚本。

**Why**：上线/更新时减少手动步骤，降低出错概率。

**How**：

```bash
#!/bin/bash
set -e

APP_DIR="/var/www/interview-handbook"

cd "$APP_DIR"

git pull origin main

cd "$APP_DIR/backend"
npm ci --production

cd "$APP_DIR/frontend"
npm ci
npm run build

cd "$APP_DIR"
pm2 reload ecosystem.config.js --env production

pm2 status
curl -s http://127.0.0.1:5000/ | head -c 50
echo "部署完成"
```

---

### 3.7 服务器初始化步骤（需在云厂商控制台完成）

| 步骤 | 操作 | 命令/说明 |
|------|------|-----------|
| 购买实例 | 1 核 2GB 起步，Ubuntu 22.04 LTS，带宽 ≥3Mbps | 云厂商控制台 |
| 安全组 | 仅开放 22/80/443，禁止 5000/5173 | 控制台配置 |
| 系统更新 | 安装补丁和基础包 | `sudo apt update && sudo apt upgrade -y` |
| 基础工具 | Nginx、Certbot、UFW、fail2ban、git | `sudo apt install -y curl wget git vim ufw fail2ban nginx certbot python3-certbot-nginx` |
| Node.js | 使用 nvm 安装 Node 20 LTS | `nvm install 20 && nvm alias default 20` |
| PM2 | 全局安装 | `npm install -g pm2` |
| 创建用户 | 非 root 部署用户 | `sudo adduser deploy && sudo usermod -aG sudo deploy` |
| SSH 加固 | 禁 root/密码登录 | 修改 `/etc/ssh/sshd_config` 后 `sudo systemctl restart sshd` |
| 防火墙 | UFW 仅放行必要端口 | `sudo ufw allow 'Nginx Full'`、`sudo ufw enable` |
| fail2ban | 防暴力破解 | 创建 `/etc/fail2ban/jail.local` 并启用 sshd |

---

### 3.8 HTTPS 证书

**What**：使用 Certbot + Let's Encrypt 为域名配置 HTTPS。

**Why**：生产站点必须 HTTPS；现代浏览器对 HTTP 站点限制更多，且 JWT token 在 HTTP 下易被拦截。

**How**：

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot renew --dry-run
```

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 服务器 OS | Ubuntu 22.04 LTS | 长期支持、Certbot 兼容好、社区文档丰富 |
| Node 版本 | 20 LTS | Express 5.2.1 兼容，Vite 构建支持好 |
| 进程管理 | PM2 fork 单实例 | SSE 长连接有状态，多实例需 sticky session，当前先保证稳定 |
| Web 服务器 | Nginx | 统一入口、静态资源托管、HTTPS、SSE 反向代理均成熟 |
| 数据库 | 继续使用 JSON | 用户已确认；通过备份脚本降低风险 |
| 部署方式 | 手动 `deploy.sh` | 当前团队规模小，零 CI/CD 依赖；后续可迁移到 GitHub Actions |
| 安全头 | X-Frame-Options / X-Content-Type-Options / Referrer-Policy | 基础安全响应头，不影响现有功能 |

---

## Verification Steps

### 6.1 后端健康检查

```bash
curl http://127.0.0.1:5000/
```

预期：返回 HTTP 200 与后端启动信息。

### 6.2 Nginx 与前端访问

```bash
curl https://your-domain.com/
```

预期：返回 `frontend/dist/index.html` 内容；浏览器访问能正常加载 SPA。

### 6.3 API 反向代理

```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

预期：后端返回认证相关响应（即使账号不存在也证明代理成功）。

### 6.4 SSE 流式验证

```bash
curl -N -H "Accept: text/event-stream" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question":"hello"}' \
  https://your-domain.com/api/ai/chat/stream
```

预期：数据逐字/逐行输出，不是一次性返回全部内容。

### 6.5 安全检查清单

- [ ] 端口 5000 未暴露在公网（仅 80/443/SSH 可访问）。
- [ ] `JWT_SECRET` 已设置为强随机字符串，且不是默认值。
- [ ] `backend/.env.production` 未进入 Git。
- [ ] HTTPS 证书有效且自动续期。
- [ ] fail2ban 已启用并生效。
- [ ] JSON 备份脚本已运行且生成 tar 包。

---

## Rollback Plan

1. **代码回滚**：在 `/var/www/interview-handbook` 执行 `git reset --hard <上一个稳定 commit>`，然后重新运行 `./deploy.sh`。
2. **配置回滚**：Nginx 配置出错时，还原 `/etc/nginx/sites-available/interview-handbook` 的上一个版本，执行 `sudo nginx -t && sudo systemctl restart nginx`。
3. **数据回滚**：从 `/var/backups/interview-handbook/` 找到最近备份，解压覆盖 `backend/data/`。
4. **服务回滚**：PM2 启动失败时，用 `pm2 logs` 查看错误，回退到上一个可用版本后 `pm2 reload`。
