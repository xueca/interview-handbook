# Week5 部署上线 — 详细执行计划

> **制定日期**: 2026-06-23 | **最后更新**: 2026-06-24（v5：重新设计脚本 + 明确进度标注）
> **原计划**: 6/19-6/25 | **实际进度**: 已延期，代码准备已全部完成

---

## 用户上下文说明

本计划中每一步都标注了**执行用户**，含义如下：

| 标注 | 含义 |
|------|------|
| `[root]` | 以 root 用户身份执行（首次 SSH 登录就是 root） |
| `[deploy]` | 以 deploy 用户身份执行（已通过 `su - deploy` 切换） |
| `[deploy + sudo]` | 以 deploy 用户身份执行，命令前加 `sudo`（deploy 已在 sudo 组） |
| `[云控制台]` | 在阿里云网页控制台操作，不涉及 SSH |

**核心原则**：
- 系统级操作（装软件、改系统配置、防火墙）→ `root` 或 `deploy + sudo`
- 应用级操作（git clone、npm install、pm2 start）→ `deploy`，**不加 sudo**
- nvm/Node.js 安装在 deploy 用户 home 下，**必须用 deploy 用户安装**

---

## 自动化脚本说明

本计划提供两个自动化脚本，覆盖不同阶段：

| 脚本 | 覆盖步骤 | 执行用户 | 前置条件 | 执行后进度 |
|------|---------|---------|---------|-----------|
| `server-setup.sh` | 2.1-4.3（完整初始化） | root | 全新服务器，什么都没装 | 阶段四完成（Day31） |
| `server-setup-3.6+.sh` | 3.6-4.3（从 PM2 启动开始） | deploy | 步骤 3.6 之前全部完成 | **阶段四完成（Day31），到达步骤 4.3** |

**你现在应该用 `server-setup-3.6+.sh`**，因为你已经在步骤 3.6 了。

### 脚本执行后你会在哪里？

执行 `server-setup-3.6+.sh` 后：

```
✓ 已完成: 3.6 → 3.7 → 3.8 → 4.1 → 4.2 → 4.3
⏳ 下一步: 4.4（浏览器验证）→ 4.5（全流程测试）
📍 总体进度: 阶段四完成（Day31）
```

也就是说，脚本跑完后，你只需要做两件事：
1. 在浏览器打开 `http://<你的公网IP>` 看页面是否正常
2. 注册/登录/答题/AI 对话，全流程测试一遍

---

## 一、当前进度盘点

### 已完成的准备工作（代码层面）

| 文件 | 作用 | 状态 |
|------|------|------|
| `backend/middleware/auth.js` | 移除 JWT_SECRET 默认 fallback，生产环境强制注入 | 已提交 |
| `backend/.env.production.example` | 生产环境变量模板（不会进入 Git） | 已创建 |
| `ecosystem.config.js` | PM2 生产进程配置（单实例 fork 模式） | 已提交 |
| `deploy.sh` | 一键部署脚本（拉代码→装依赖→构建→重启） | 已提交 |
| `backend/scripts/backup-data.sh` | JSON 数据定时备份（保留 30 天） | 已提交 |
| `nginx/interview-handbook.conf` | Nginx SSE 生产配置（proxy_buffering off 等） | 已提交 |
| `.gitattributes` | 强制 .sh/.conf 使用 LF 换行符 | 已提交 |
| `server-setup.sh` | 完整服务器初始化脚本（2.1-4.3） | 已提交 |
| `server-setup-3.6+.sh` | 从步骤 3.6 开始的自动化脚本 | 已提交 |

---

## 二、详细步骤

### 阶段一：购买服务器（Day29，约 1 小时）

**目标**：获得一台可 SSH 登录的 Ubuntu 22.04 云服务器。

#### 步骤 1.1：购买阿里云轻量应用服务器 `[云控制台]`

1. 打开 [阿里云轻量应用服务器](https://swas.console.aliyun.com/)
2. 学生认证（如果有），享受优惠（约 68 元/年）
3. 选择配置：
   - **地区**：离你最近的（华北/华东）
   - **镜像**：系统镜像 → Ubuntu 22.04 LTS
   - **套餐**：2 核 2GB（最低配置即可跑 Express + Nginx）
   - **时长**：1 个月（先试，后续再续费）
4. 购买后，进入控制台，记录以下信息：
   - **公网 IP**：`___.___.___.___`
   - **root 密码**：在控制台「远程连接」→「重置密码」设置

**验证预期**：购买完成后，在阿里云控制台能看到「运行中」状态，且已分配公网 IP。

#### 步骤 1.2：配置安全组（防火墙规则） `[云控制台]`

在轻量服务器控制台 → 防火墙 → 添加规则：

| 端口 | 协议 | 说明 |
|------|------|------|
| 22 | TCP | SSH 远程登录 |
| 80 | TCP | HTTP（Nginx） |
| 443 | TCP | HTTPS（Certbot 自动配置） |

> ⚠️ **不要**开放 5000（后端端口）和 5173（Vite 开发端口），只通过 Nginx 反向代理访问。

**验证预期**：在控制台「防火墙」页面能看到 22/80/443 三条规则，状态为「允许」。5000 和 5173 不在列表中。

#### 步骤 1.3：SSH 登录验证 `[root]`

```bash
# 在你的本地电脑执行
ssh root@<你的公网IP>
```

**验证预期**：
- 终端显示类似 `root@your-server:~#` 的提示符
- 执行 `whoami` 输出 `root`
- 执行 `cat /etc/os-release` 输出包含 `Ubuntu 22.04`

如果能登录，服务器就准备好了。**后续所有操作都在这个 SSH 会话中进行。**

---

### 阶段二：服务器初始化（Day29，约 1.5 小时）

**目标**：安装 Node.js、Nginx、PM2，配置安全基线。

> **本阶段用户切换路径**：`root` → 创建 `deploy` → 切换到 `deploy` → 后续全部用 `deploy`

#### 步骤 2.1：系统更新 + 基础包 `[root]`

```bash
# 当前是 root 用户
apt update && apt upgrade -y
apt install -y curl wget git vim ufw fail2ban nginx certbot python3-certbot-nginx
```

> 注意：root 用户不需要 `sudo` 前缀。

**验证预期**：
- `apt update` 无报错，显示 "Reading package lists... Done"
- `apt upgrade` 显示 "0 upgraded, 0 newly installed, 0 to remove" 或升级了若干包
- `nginx -v` 输出类似 `nginx version: nginx/1.18.0`
- `certbot --version` 输出类似 `certbot 2.x.x`
- `ufw --version` 输出版本号

#### 步骤 2.2：创建部署用户 `[root]`

```bash
# 当前是 root 用户
adduser deploy
# 按提示设置密码，其他信息可直接回车跳过

# 给 deploy 用户 sudo 权限
usermod -aG sudo deploy

# 验证
su - deploy
sudo whoami
# 应输出: root（说明 deploy 有 sudo 权限）
```

**验证预期**：
- `adduser deploy` 成功，提示 "Adding user 'deploy' ..."
- `sudo whoami` 输出 `root`
- 当前提示符变为 `deploy@your-server:~$`

> 从这一步起，**后续所有操作都用 deploy 用户**。如果你还在 root，执行 `su - deploy` 切换过去。

#### 步骤 2.3：安装 Node.js 20 LTS `[deploy]`

```bash
# 确认当前是 deploy 用户: whoami 应输出 deploy
whoami

# 安装 nvm（安装到 deploy 的 home 目录）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc

# 安装 Node.js 20
nvm install 20
nvm alias default 20
node -v   # 确认 >= 20.x
npm -v
```

**验证预期**：
- `whoami` 输出 `deploy`
- `node -v` 输出 `v20.x.x`（如 `v20.15.0`）
- `npm -v` 输出 `10.x.x`
- `which node` 输出 `/home/deploy/.nvm/versions/node/v20.x.x/bin/node`

> ⚠️ **必须用 deploy 用户安装 nvm**。如果用 root 安装，deploy 用户找不到 node 命令。

#### 步骤 2.4：安装 PM2 `[deploy]`

```bash
# 当前是 deploy 用户
npm install -g pm2
pm2 --version
```

**验证预期**：
- `pm2 --version` 输出类似 `5.4.x`
- `which pm2` 输出 `/home/deploy/.nvm/versions/node/v20.x.x/bin/pm2`

#### 步骤 2.5：配置防火墙（UFW） `[deploy + sudo]`

```bash
# 当前是 deploy 用户，需要 sudo
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 'Nginx Full'
sudo ufw enable
# 提示 "Command may disrupt existing ssh connections" 输入 y
sudo ufw status
```

**验证预期**：
- `sudo ufw status` 输出包含：
  ```
  To                         Action      From
  --                         ------      ----
  22/tcp                     ALLOW       Anywhere
  Nginx Full                 ALLOW       Anywhere
  ```
- 状态为 `Status: active`

#### 步骤 2.6：配置 fail2ban `[deploy + sudo]`

```bash
# 当前是 deploy 用户
sudo vim /etc/fail2ban/jail.local
```

写入内容：

```ini
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
```

启动：

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban
```

**验证预期**：
- `sudo systemctl status fail2ban` 输出包含 `Active: active (running)`
- `sudo fail2ban-client status` 输出包含 `sshd`
- `sudo fail2ban-client status sshd` 输出当前监控的 IP 列表（刚启动时为空）

#### 步骤 2.7：SSH 加固（可选，推荐） `[deploy + sudo]`

```bash
# 当前是 deploy 用户
sudo vim /etc/ssh/sshd_config
```

修改以下行：

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

然后重启 SSH：

```bash
sudo systemctl restart sshd
```

**验证预期**：
- `sudo sshd -t` 无报错输出（验证配置文件语法）
- 新开一个终端窗口，执行 `ssh deploy@<公网IP>` 能正常登录
- （如果配置了密钥）`ssh root@<公网IP>` 被拒绝，提示 "Permission denied"

> ⚠️ 改之前确保已配置 SSH 密钥，否则会把自己锁在外面。如果不会配密钥，**先跳过这一步**，等后续配好密钥再改。

---

### 阶段三：部署后端（Day30，约 2 小时）

**目标**：在服务器上跑通 Express 后端，所有 API 可 curl 调用。

> **本阶段全部用 deploy 用户**。需要特权的命令加 `sudo`。

#### 步骤 3.1：创建部署目录 + 拉取代码 `[deploy + sudo]` → `[deploy]`

```bash
# 当前是 deploy 用户

# 创建目录（需要 sudo，因为 /var/www 默认 root 所有）
sudo mkdir -p /var/www

# 把目录所有者改为 deploy
sudo chown deploy:deploy /var/www

# 后续不需要 sudo 了
cd /var/www
git clone https://github.com/xueca/interview-handbook.git
cd interview-handbook
git checkout reborn   # 当前代码在 reborn 分支

# 验证文件存在
ls -la
```

**验证预期**：
- `ls -la` 输出包含 `backend/`、`frontend/`、`ecosystem.config.js`、`nginx/` 等目录/文件
- `git branch` 输出 `* reborn`（当前在 reborn 分支）
- `ls backend/app.js` 存在

#### 步骤 3.2：创建生产环境变量 `[deploy]`

```bash
# 当前是 deploy 用户，操作自己拥有的文件，不需要 sudo
cd /var/www/interview-handbook/backend

# 生成 JWT_SECRET（记录输出值）
openssl rand -hex 32
# 输出示例: a3f5e8b2c1d4...（64 位十六进制字符串）

# 复制模板
cp .env.production.example .env.production.active

# 编辑真实密钥
vim .env.production.active
```

填入真实值：

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=<上面 openssl 生成的字符串>
DEEPSEEK_API_KEY=<你的 DeepSeek API Key>
```

**验证预期**：
- `cat .env.production.active` 输出包含真实的 JWT_SECRET（64 位十六进制字符串）和 DEEPSEEK_API_KEY
- `ls -la .env.production.active` 文件存在，所有者为 deploy:deploy
- `cat .gitignore` 确认 `.env*` 在忽略列表中（确保不会提交到 Git）

#### 步骤 3.3：修改 ecosystem.config.js 中的 env_file 路径 `[deploy]`

```bash
# 当前是 deploy 用户
vim /var/www/interview-handbook/ecosystem.config.js
```

把 `env_file` 改为：

```js
env_file: '/var/www/interview-handbook/backend/.env.production.active',
```

**验证预期**：
- `grep env_file ecosystem.config.js` 输出包含 `.env.production.active`

#### 步骤 3.4：安装依赖 `[deploy]`

```bash
# 当前是 deploy 用户
cd /var/www/interview-handbook/backend
npm ci --production
```

**验证预期**：
- 安装完成无报错，最后一行显示 "added xxx packages in xxs"
- `ls node_modules/` 目录存在且包含 express、jsonwebtoken 等包
- `ls node_modules/express/package.json` 存在

#### 步骤 3.5：创建 PM2 日志目录 `[deploy + sudo]`

```bash
# 当前是 deploy 用户，/var/log 需要 sudo
sudo mkdir -p /var/log/pm2
sudo chown -R deploy:deploy /var/log/pm2
```

**验证预期**：
- `ls -ld /var/log/pm2` 输出 `drwxr-xr-x ... deploy deploy ... /var/log/pm2`
- `touch /var/log/pm2/test && rm /var/log/pm2/test` 成功（deploy 用户有写入权限）

---

### 阶段三（续）：步骤 3.6-4.3 自动化脚本 `[deploy]`

> **重要**：从步骤 3.6 开始，可以使用自动化脚本 `server-setup-3.6+.sh` 完成剩余所有步骤。
>
> **脚本作用**：自动执行 3.6（启动 PM2）→ 3.7（验证后端）→ 3.8（开机自启）→ 4.1（构建前端）→ 4.2-4.3（配置 Nginx）→ 最终验证
>
> **执行后进度**：**阶段四完成（Day31），到达步骤 4.3**。下一步是 4.4（浏览器验证）和 4.5（全流程测试）。

#### 使用方式

```bash
# 当前是 deploy 用户
cd /var/www/interview-handbook
bash server-setup-3.6+.sh
```

脚本会：
1. 检查前置条件（环境变量文件、依赖、PM2 是否存在）
2. 从 `.env.production.active` 读取 JWT_SECRET 和 DEEPSEEK_API_KEY
3. 启动 PM2 并验证状态为 `online`
4. curl 验证健康检查、登录 API、SSE 接口
5. 设置 PM2 开机自启
6. 构建前端
7. 自动获取公网 IP，配置 Nginx
8. 本地 + 公网 curl 测试
9. 输出完成状态和后续步骤

**脚本执行后，你会到达步骤 4.3（阶段四完成）。**

```
✓ 脚本已完成: 3.6 → 3.7 → 3.8 → 4.1 → 4.2 → 4.3
⏳ 你接下来做: 4.4（浏览器验证）→ 4.5（全流程测试）
📍 总体进度: 阶段四完成（Day31）
```

---

#### 步骤 3.6：启动 PM2（手动方式，如不用脚本） `[deploy]`

```bash
# 当前是 deploy 用户
cd /var/www/interview-handbook

# 从 .env.production.active 读取环境变量
export JWT_SECRET=$(grep "^JWT_SECRET=" backend/.env.production.active | cut -d= -f2)
export DEEPSEEK_API_KEY=$(grep "^DEEPSEEK_API_KEY=" backend/.env.production.active | cut -d= -f2)

# 启动 PM2（使用 env 注入环境变量）
pm2 start backend/app.js --name interview-handbook-api \
  --env NODE_ENV=production \
  --env PORT=5000 \
  --env JWT_SECRET="$JWT_SECRET" \
  --env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY"

# 查看状态
pm2 status
pm2 logs interview-handbook-api --lines 20
```

**验证预期**：
- `pm2 status` 输出包含 `interview-handbook-api`，状态为 `online`
- `pm2 logs interview-handbook-api --lines 20` 最后几行无报错，显示 "Server running on port 5000" 或类似信息
- `ps aux | grep node` 能看到 node 进程在运行

#### 步骤 3.7：验证后端（手动方式） `[deploy]`

```bash
# 当前是 deploy 用户

# 健康检查
curl http://127.0.0.1:5000/
# 预期返回: Hello World!

# 测试登录 API
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
# 预期返回: JSON 响应（即使账号不存在，也证明路由正常）

# 测试 SSE 流式接口
curl -N -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"question":"hello"}' \
  http://127.0.0.1:5000/api/ai/chat/stream
# 预期: 逐行返回 SSE 数据
```

**验证预期**：

| 测试 | 预期输出 | 如果不对 |
|------|---------|---------|
| 健康检查 | `Hello World!` | 后端没启动，检查 `pm2 logs` |
| 登录 API | `{"error":"用户不存在"}` 或 `{"error":"密码错误"}` | 路由问题，检查 `backend/routes/auth.js` |
| SSE 接口 | 多行 `data: {...}` 格式，逐行输出 | 后端 SSE 逻辑问题，检查 `backend/controllers/aiController.js` |

#### 步骤 3.8：设置 PM2 开机自启（手动方式） `[deploy + sudo]`

```bash
# 当前是 deploy 用户
# pm2 startup 会输出一条 sudo 命令，需要复制粘贴执行
pm2 startup systemd

# 输出类似:
# [PM2] To setup the Startup Script, copy/paste the following command:
# sudo env PATH=$PATH:/home/deploy/.nvm/versions/node/v20.x/bin pm2 startup systemd -u deploy --hp /home/deploy

# 复制上面输出的那条 sudo 命令，粘贴执行
sudo env PATH=$PATH:/home/deploy/.nvm/versions/node/v20.x/bin pm2 startup systemd -u deploy --hp /home/deploy

# 保存当前进程列表
pm2 save
```

**验证预期**：
- `pm2 startup systemd` 输出提示 "copy/paste the following command"
- 执行 sudo 命令后输出 "[PM2] [v] Command successfully executed"
- `pm2 save` 输出 "[PM2] Saving current process list..."
- `sudo systemctl status pm2-deploy`（或类似服务名）显示 `Active: active (running)`
- 执行 `sudo reboot` 重启服务器后，重新登录执行 `pm2 status`，interview-handbook-api 自动恢复 online

> ⚠️ `pm2 startup` 输出的命令包含 deploy 的 nvm 路径，**必须完整复制粘贴**，不要手打。

---

### 阶段四：部署前端 + Nginx（Day31，约 2 小时）

**目标**：通过公网 IP 访问完整站点。

> **提示**：如果使用 `server-setup-3.6+.sh` 脚本，阶段四会自动完成。

#### 步骤 4.1：构建前端 `[deploy]`

```bash
# 当前是 deploy 用户
cd /var/www/interview-handbook/frontend
npm ci
npm run build
# 构建产物在 frontend/dist/

# 验证
ls -la dist/
# 应该看到 index.html, assets/ 等
```

**验证预期**：
- `npm run build` 输出 "dist/                     0.05 kB │ gzip: 0.07 kB" 等构建信息，最后显示 "BUILD complete"
- `ls dist/` 包含 `index.html` 和 `assets/` 目录
- `ls dist/assets/` 包含 `.js` 和 `.css` 文件
- `cat dist/index.html` 包含 `<script type="module" crossorigin src="/assets/index-xxx.js">`

#### 步骤 4.2：配置 Nginx `[deploy + sudo]`

```bash
# 当前是 deploy 用户

# 复制配置文件到 Nginx 目录（需要 sudo）
sudo cp /var/www/interview-handbook/nginx/interview-handbook.conf \
  /etc/nginx/sites-available/interview-handbook

# 修改 server_name 为你的公网 IP（需要 sudo，因为文件在 /etc 下）
sudo vim /etc/nginx/sites-available/interview-handbook
```

把 `server_name your-domain.com www.your-domain.com;` 改为：

```nginx
server_name <你的公网IP>;
```

**验证预期**：
- `sudo cat /etc/nginx/sites-available/interview-handbook | grep server_name` 输出你的公网 IP
- `sudo cat /etc/nginx/sites-available/interview-handbook | grep proxy_buffering` 输出 `proxy_buffering off;`

#### 步骤 4.3：启用站点 + 重启 Nginx `[deploy + sudo]`

```bash
# 当前是 deploy 用户

# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/

# 删除默认站点（可选，避免冲突）
sudo rm -f /etc/nginx/sites-enabled/default

# 检查配置语法
sudo nginx -t
# 预期: syntax is ok / test is successful

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl status nginx
```

**验证预期**：
- `sudo nginx -t` 输出 "syntax is ok" 和 "test is successful"
- `sudo systemctl status nginx` 输出 `Active: active (running)`
- `sudo ss -tlnp | grep :80` 输出 `LISTEN ... nginx`
- `curl -I http://127.0.0.1/` 返回 HTTP/1.1 200 OK

#### 步骤 4.4：验证前端 `[浏览器]`

在浏览器中打开：`http://<你的公网IP>`

**验证预期**：
- 浏览器显示 interview-handbook 登录页面（有用户名/密码输入框）
- 浏览器开发者工具 Network 面板中，请求 `http://<公网IP>/` 返回 200，Content-Type 为 `text/html`
- 无 404 或 500 错误

#### 步骤 4.5：全流程测试 `[浏览器]`

1. 注册新账号
2. 登录
3. 浏览题库（筛选分类、搜索）
4. 开始答题 → 提交 → 查看结果
5. AI 对话 → 发送消息 → 观察 SSE 流式输出
6. Dashboard 统计图表
7. 错题本
8. 暗黑模式切换

**验证预期**：

| 功能 | 预期表现 | 如果不对 |
|------|---------|---------|
| 注册 | 提示 "注册成功"，自动跳转到登录页 | 检查后端 `/api/auth/register` 是否返回 200 |
| 登录 | 提示 "登录成功"，跳转到首页 | 检查 JWT token 是否正确生成 |
| 题库列表 | 显示题目列表，有分类筛选下拉框 | 检查 `/api/questions` 返回数据 |
| 答题 | 显示题目和选项，能选择答案 | 检查前端路由 `/practice/:id` |
| 提交答案 | 显示结果页，有正确/错误提示 | 检查 `/api/records` 是否写入 |
| AI 对话 | AI 回复逐字显示（打字机效果） | 检查 SSE 是否正常工作 |
| Dashboard | 显示统计图表（柱状图+折线图） | 检查 `/api/stats` 返回数据 |
| 暗黑模式 | 点击切换按钮，页面变暗色 | 检查 localStorage 和 CSS 变量 |

---

### 阶段五：配置域名 + HTTPS（Day31 额外，约 1 小时）

**前置条件**：已购买域名，并在 DNS 控制台将 A 记录指向服务器公网 IP。

#### 步骤 5.1：修改 Nginx 配置 `[deploy + sudo]`

```bash
# 当前是 deploy 用户
sudo vim /etc/nginx/sites-available/interview-handbook
```

把 `server_name` 改为你的域名：

```nginx
server_name your-domain.com www.your-domain.com;
```

**验证预期**：
- `sudo nginx -t` 输出 "syntax is ok"
- `sudo systemctl restart nginx` 成功

#### 步骤 5.2：安装 HTTPS 证书 `[deploy + sudo]`

```bash
# 当前是 deploy 用户
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

按提示输入邮箱，同意条款。Certbot 会自动修改 Nginx 配置添加 HTTPS 并重启 Nginx。

**验证预期**：
- Certbot 输出 "Congratulations! You have successfully enabled HTTPS"
- `sudo cat /etc/nginx/sites-available/interview-handbook` 中包含 `listen 443 ssl;` 和证书路径
- 浏览器访问 `https://your-domain.com` 显示绿色锁图标（证书有效）

#### 步骤 5.3：验证自动续期 `[deploy + sudo]`

```bash
sudo certbot renew --dry-run
```

**验证预期**：
- 输出 "Congratulations, all simulated renewals succeeded"
- `sudo systemctl list-timers | grep certbot` 显示 certbot 定时任务已设置

---

### 阶段六：线上 Bug 修复 + Demo 视频（Day32，约 3 小时）

**目标**：确保线上稳定，录制演示视频。

#### 步骤 6.1：线上 Bug 排查 `[deploy]`

按优先级排查：

1. **SSE 流式输出**：在 Nginx 后面确认 AI 回复是逐字返回的（不是一次性返回）。如果卡住，检查 `proxy_buffering off` 是否生效。
   ```bash
   # 查看当前 Nginx 配置
   sudo cat /etc/nginx/sites-available/interview-handbook
   # 确认 proxy_buffering off; 存在
   ```
   **验证预期**：配置文件中包含 `proxy_buffering off;`

2. **跨域问题**：如果前端请求 `/api/` 被 CORS 拦截，检查 Nginx 配置中 `/api/` location 是否生效。
   ```bash
   curl -I http://<公网IP>/api/questions
   # 应返回 200，不是 404 或 403
   ```
   **验证预期**：返回 HTTP/1.1 200 OK

3. **登录注册**：确认 JWT 认证正常，token 过期后能重新登录。
   ```bash
   # 测试 token 生成
   curl -X POST http://127.0.0.1:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"你的注册账号","password":"你的密码"}'
   ```
   **验证预期**：返回 `{"token":"eyJhbG..."}` 格式的 JWT token

4. **JSON 数据写入**：答题后 records.json 正常更新，marks.json 正常写入。
   ```bash
   # 检查数据文件权限
   ls -la /var/www/interview-handbook/backend/data/
   # 所有者应为 deploy:deploy
   ```
   **验证预期**：
   - `records.json` 和 `marks.json` 文件存在
   - 所有者为 `deploy:deploy`
   - 文件大小 > 0 bytes（有数据写入）
   - `cat records.json | wc -l` 显示多行（有记录）

#### 步骤 6.2：录 Demo 视频（3 分钟）

用 OBS 或系统自带录屏，按以下顺序：

| 时间段 | 内容 | 操作 |
|--------|------|------|
| 0:00-0:30 | 打开公网地址，展示登录注册 | 输入网址 → 注册 → 登录 |
| 0:30-1:30 | 展示答题流程 | 选分类 → 答题 → 提交 → 看结果 |
| 1:30-2:30 | 展示 AI 功能 | AI 出题 → SSE 打字机效果 |
| 2:30-3:00 | 展示 Dashboard + 暗黑模式 | 统计图表 → 切换暗黑模式 |

上传到 B 站（或网盘），链接放 README。

---

### 阶段七：README + 项目文档（Day33，约 4 小时）

**目标**：写一份专业的 README.md 和踩坑记录。

#### 步骤 7.1：写 README.md（自己写）

内容结构：

```markdown
# 面试宝典（Interview Handbook）

一句话介绍：AI 驱动的面试刷题工具，支持在线答题、AI 智能出题、SSE 流式输出。

## 在线地址
https://your-domain.com

## 功能截图
（放 4-6 张截图：首页、题库、答题、AI 对话、Dashboard、暗黑模式）

## 技术栈
- 前端：Vue3 + Vite + Element Plus + Pinia + ECharts
- 后端：Express + JSON 文件存储
- AI：DeepSeek API + SSE 流式输出
- 部署：阿里云 + Nginx + PM2

## 本地运行
（3 步：clone → npm install → npm run dev）

## 部署步骤
（链接到 deploy.sh + nginx 配置）
```

用截图工具截 4-6 张页面截图，放到 `docs/screenshots/` 目录下。

#### 步骤 7.2：写踩坑记录（面试金矿）

创建 `docs/pitfalls.md`，记录 3 个坑：

1. **AI 出题格式不稳定**
   - 问题：AI 返回的 JSON 经常格式不对
   - 现象：前端解析失败，题目显示异常
   - 排查：发现 DeepSeek 有时返回裸 JSON，有时包裹在 code block 里
   - 解决：写了正则提取 JSON + 容错降级处理
   - 教训：对接 AI 接口必须做容错，不能假设 AI 100% 遵守格式

2. **JSON 文件并发写冲突**
   - 问题：多个请求同时写 JSON 文件会丢数据
   - 现象：答题记录偶尔丢失
   - 排查：fs.writeFileSync 不是原子操作
   - 解决：封装统一的读写工具，用简单的锁机制（写队列）
   - 教训：JSON 文件不适合高并发，但我们的场景（单用户）够用

3. **生产环境 SSE 流式输出卡住**
   - 问题：本地正常，部署到 Nginx 后 SSE 不流式
   - 现象：AI 回复等了很久一次性返回
   - 排查：发现 Nginx 默认开启 proxy_buffering
   - 解决：在 Nginx 配置中关闭 buffer
   - 教训：SSE 部署必须检查反向代理的缓冲配置

---

### 阶段八：更新简历（Day34，约 3 小时）

**目标**：把项目写到简历中，准备面试话术。

#### 步骤 8.1：更新简历项目经历

在简历中新增项目：

**项目名称**：面试宝典（AI 刷题助手）

**时间**：2026.5-2026.6

**技术栈**：Vue3 + Express + DeepSeek API + ECharts + Nginx + PM2

**核心工作**：
- 独立完成前后端全链路开发，包含用户认证、题库管理、在线答题、AI 出题、学习统计
- 实现 SSE 流式输出，AI 回复逐字显示，替代传统的 loading 等待体验（**核心技术亮点**）
- 设计 AI Prompt，实现 DeepSeek API 后端转发，解决 API Key 泄露风险
- 用 JSON 文件替代数据库，封装统一读写工具，降低部署复杂度
- 使用 ECharts 实现学习统计大屏，包含正确率趋势图、知识点分布图
- 基于 Nginx + PM2 部署在阿里云服务器，实现公网访问

**亮点数字**：
- 预置 50 道前端面试题
- 支持 AI 智能出题
- 支持 5 种分类筛选

#### 步骤 8.2：更新 GitHub README + 截图

确保 GitHub 仓库 README 和线上站点的 README 一致，截图已上传。

---

### 阶段九：Week5 复盘（Day35，约 2 小时）

**目标**：确认一切就绪，可以进入 Week6 面试准备。

#### 步骤 9.1：三件事确认

- [ ] 线上地址能打开（浏览器访问正常）
- [ ] AI 功能正常（SSE 流式输出逐字返回）
- [ ] Demo 视频能看（上传到 B 站/网盘，链接可访问）

#### 步骤 9.2：全流程走一遍

1. 注册新账号
2. 登录
3. 题库浏览 + 筛选
4. 答题 + 提交
5. AI 对话 + 出题
6. Dashboard 统计
7. 错题本
8. 暗黑模式切换

#### 步骤 9.3：标记完成

三件事都确认后，Week5 完成，进入 Week6 面试准备。

---

## 三、用户切换速查表

| 阶段 | 步骤 | 执行用户 | 说明 |
|------|------|---------|------|
| 一 | 1.1-1.2 | 云控制台 | 网页操作 |
| 一 | 1.3 | root | 首次 SSH 登录 |
| 二 | 2.1 | root | 系统更新，root 不需要 sudo |
| 二 | 2.2 | root → deploy | root 创建 deploy，然后切换 |
| 二 | 2.3-2.4 | deploy | nvm/PM2 安装在 deploy home 下 |
| 二 | 2.5-2.7 | deploy + sudo | 系统级配置需要 sudo |
| 三 | 3.1 | deploy + sudo → deploy | sudo 建目录授权，deploy 拉代码 |
| 三 | 3.2-3.4 | deploy | 操作自己拥有的文件 |
| 三 | 3.5 | deploy + sudo | /var/log 需要 sudo |
| 三 | 3.6-4.3 | deploy | **可用 server-setup-3.6+.sh 脚本自动完成** |
| 五 | 5.1-5.3 | deploy + sudo | Nginx + Certbot 需要 sudo |
| 六 | 6.1 | deploy | 日志查看、数据检查 |
| 七-九 | — | 本地电脑 | 写文档、简历，不涉及服务器 |

---

## 四、常见问题预案

### Q: 阿里云买不了/太贵怎么办？

**方案 A**：用腾讯云轻量应用服务器，操作几乎一样，也有学生优惠。  
**方案 B**：用 [Railway](https://railway.app/) 或 [Render](https://render.com/) 免费部署（无需买服务器，但需绑定信用卡，有免费额度）。

### Q: 公网 IP 访问不了怎么办？

1. 检查安全组/防火墙是否开放了 80 端口
2. 检查 Nginx 是否启动：`sudo systemctl status nginx`
3. 检查后端是否启动：`pm2 status`
4. curl 本地测试：`curl http://127.0.0.1:5000/`

### Q: SSE 流式输出不工作怎么办？

1. 确认 Nginx 配置中 `proxy_buffering off` 已生效
2. 确认后端 SSE 接口直接 curl 能流式输出
3. 检查 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`

### Q: frontend/dist 构建后访问白屏？

1. 检查 Vite 构建输出路径是否正确
2. 检查 Nginx `try_files` 配置是否包含 `/index.html` fallback
3. 检查浏览器控制台是否有 JS 报错

### Q: 域名还没有怎么办？

可以先用公网 IP 访问，Nginx 配置中 `server_name` 填 IP 地址即可。域名可以后续再买。

### Q: npm install 报权限错误（EACCES）？

说明你用了 root 或 sudo 执行 npm install。**不要用 sudo npm install**。正确做法：

```bash
# 确认当前用户
whoami
# 应输出 deploy

# 如果不是 deploy，切换过去
su - deploy

# 然后重新执行
cd /var/www/interview-handbook/backend
npm ci --production
```

### Q: pm2 命令找不到？

说明 nvm 环境没有加载。执行：

```bash
source ~/.bashrc
# 或者
source ~/.nvm/nvm.sh
```

如果还是找不到，说明 nvm 是用 root 安装的，需要用 deploy 用户重新安装（步骤 2.3）。

### Q: git clone 报权限错误？

说明 `/var/www` 目录所有者不是 deploy。修复：

```bash
sudo chown -R deploy:deploy /var/www
```

### Q: PM2 日志写入失败？

说明 `/var/log/pm2` 目录所有者不是 deploy。修复：

```bash
sudo chown -R deploy:deploy /var/log/pm2
```

### Q: server-setup-3.6+.sh 脚本执行失败？

1. 检查当前用户是否为 deploy：`whoami`
2. 检查前置条件是否满足（环境变量文件、依赖、PM2）
3. 查看脚本输出的错误信息
4. 如果某一步失败，可以手动执行该步骤（参考「手动方式」部分）