# 保存当前状态 + 无域名版第五步

## 摘要

AI 出题已修复并验证可用，当前 HEAD 为 `bd810f3`。本计划做两件事：
1. **保存当前工作状态**（git tag + 备份分支），防止后续 AI 乱改导致出题问题时可秒级回退
2. **制定无域名版第五步**：原计划第五步是"配置域名 + HTTPS"，用户不买域名，改为"Nginx 生产加固 + IP 访问优化"

---

## 一、保存当前状态

### 1.1 当前状态确认

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `bd810f3` (feat: 后端控制器/路由更新 + Dashboard图表防抖/响应式/ESLint配置) |
| 分支 | `reborn` |
| AI 出题 | ✅ 已修复，前端发送 `params` 对象，后端从 `req.body` 读取 `category/difficulty` |
| 已有 tags | 无 |

### 1.2 保存操作

#### Step 1: 创建 git tag（轻量级标记，指向当前提交）

```bash
# 在本地项目目录执行
git tag -a v-ai-working -m "AI出题修复完成，前后端全链路验证通过 (2026-06-26)"
git push origin v-ai-working
```

#### Step 2: 创建备份分支（双保险）

```bash
git branch backup-2026-06-26-ai-working
git push origin backup-2026-06-26-ai-working
```

### 1.3 回退方法（未来需要时用）

如果后续 AI 乱改导致出题问题，秒级回退：

```bash
# 方法1：用 tag 回退（推荐）
git checkout v-ai-working

# 方法2：用备份分支回退
git checkout backup-2026-06-26-ai-working

# 回退后在服务器执行
cd /var/www/interview-handbook
git fetch origin
git checkout v-ai-working   # 或 backup-2026-06-26-ai-working
cd frontend && npm ci && npm run build
cd .. && pm2 reload ecosystem.config.js --env production
```

---

## 二、无域名版第五步：Nginx 生产加固

### 2.1 原计划 vs 修改计划

| 原计划第五步 | 修改后（无域名） |
|-------------|----------------|
| 5.1 修改 Nginx server_name 为域名 | ❌ 跳过 — 继续用 IP |
| 5.2 用 certbot 安装 HTTPS 证书 | ❌ 跳过 — 无域名无法用 Let's Encrypt |
| 5.3 验证证书自动续期 | ❌ 跳过 — 无证书 |
| **新增** 5.1 Nginx 安全头加固 | ✅ 添加安全响应头 |
| **新增** 5.2 Gzip 压缩 | ✅ 减小传输体积 |
| **新增** 5.3 静态资源缓存 | ✅ 首次加载后缓存 JS/CSS |
| **新增** 5.4 SPA 路由 fallback | ✅ 确保刷新不 404 |
| **新增** 5.5 验证 IP 访问全流程 | ✅ 确认公网 IP 访问稳定 |

### 2.2 修改文件

**文件**: `nginx/interview-handbook.conf`

在现有配置基础上增加以下内容：

#### 5.1 安全头加固

在 `server` 块内添加：

```nginx
# 安全响应头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**为什么**：防止点击劫持、MIME 嗅探、XSS，基础安全基线。

#### 5.2 Gzip 压缩

在 `http` 块（或 server 块顶部）添加：

```nginx
# Gzip 压缩（减小 JS/CSS/JSON 传输体积）
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

**为什么**：Vite 构建的 JS 文件通常 200KB+，gzip 后可压缩到 60KB 左右，首屏加载快 3 倍。

#### 5.3 静态资源缓存

在 `location /assets/` 块内添加：

```nginx
# Vite 构建产物带 hash 文件名，可长期缓存
location /assets/ {
    alias /var/www/interview-handbook/frontend/dist/assets/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**为什么**：Vite 的文件名带 content hash（如 `index-a3f5e8.js`），内容变了文件名就变，所以可以放心缓存 1 年。二次访问直接走浏览器缓存，秒开。

#### 5.4 SPA 路由 fallback

确认 `location /` 块内有：

```nginx
location / {
    root /var/www/interview-handbook/frontend/dist;
    try_files $uri $uri/ /index.html;  # ← 关键：SPA 路由刷新不 404
}
```

**为什么**：Vue Router 的 history 模式下，刷新 `/question-bank` 这样的路由时，Nginx 会找 `/var/www/.../question-bank` 文件，不存在就 404。`try_files` 让它 fallback 到 `index.html`，由前端路由接管。

### 2.3 完整 Nginx 配置（修改后）

完整的 `nginx/interview-handbook.conf` 应包含：

```nginx
server {
    listen 80;
    server_name _;  # 无域名，匹配所有 IP 访问

    # 安全响应头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 前端静态文件
    location / {
        root /var/www/interview-handbook/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Vite 构建产物（带 hash，长期缓存）
    location /assets/ {
        alias /var/www/interview-handbook/frontend/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 关键：关闭响应缓冲，确保流式数据即时转发
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }
}
```

### 2.4 部署步骤

```bash
# 1. 本地修改 nginx 配置后提交推送
# （AI 执行）

# 2. 服务器拉取并更新
cd /var/www/interview-handbook
git pull origin reborn

# 3. 更新 Nginx 配置
sudo cp nginx/interview-handbook.conf /etc/nginx/sites-available/interview-handbook
sudo nginx -t
sudo systemctl restart nginx

# 4. 验证
curl -I http://127.0.0.1/
# 预期: HTTP/1.1 200 OK，响应头包含 X-Frame-Options 等
```

### 2.5 验证步骤

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | `curl -I http://<公网IP>/` | 200 OK + 安全头存在 |
| 2 | `curl -I http://<公网IP>/assets/` | 200 + `Cache-Control: public, immutable` |
| 3 | 浏览器打开 `http://<公网IP>/question-bank` 刷新 | 不 404，正常显示题库 |
| 4 | 浏览器 DevTools → Network → 查看 JS 文件 | `Content-Encoding: gzip` |
| 5 | 二次刷新页面 | JS 走缓存，加载时间 < 100ms |
| 6 | AI 出题 | 仍然正常（SSE 不受影响） |

---

## 三、关于 HTTPS 的说明

无域名的情况下无法使用 Let's Encrypt 免费证书（certbot 要求有域名）。选项：

| 选项 | 可行性 | 推荐度 |
|------|--------|--------|
| 不用 HTTPS，纯 HTTP | ✅ 可行，IP 访问 | ⭐⭐⭐ 推荐（面试演示够用） |
| 自签名证书 | ✅ 可行，但浏览器报不安全警告 | ⭐ 不推荐（体验差） |
| 以后买域名再上 HTTPS | ✅ 可行，随时可加 | ⭐⭐ 后续考虑 |

**建议**：面试演示阶段用 HTTP + IP 完全够用。后续如果需要 HTTPS，买个便宜域名（9 元/年）+ certbot 即可，不影响现有代码。

---

## 四、决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 保存方式 | git tag + 备份分支 | 双保险，tag 轻量不可变，分支可追加提交 |
| tag 名称 | `v-ai-working` | 简洁明了，语义清晰 |
| 第五步改造 | 跳过域名/HTTPS，改为 Nginx 加固 | 用户不买域名，IP 访问已验证可用 |
| HTTPS 方案 | 暂不上 | 无域名无法用 Let's Encrypt，自签名体验差 |

---

*计划版本: v1.0 | 生成日期: 2026-06-26*
