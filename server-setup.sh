#!/bin/bash
# 文件功能: interview-handbook 服务器一键初始化脚本 | 数据流: root → deploy → 安装环境 → 拉代码 → 启动服务
# 使用方式: 以 root 用户执行: bash server-setup.sh

set -e

APP_DIR="/var/www/interview-handbook"
LOG_DIR="/var/log/pm2"
BACKUP_DIR="/var/backups/interview-handbook"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==================== 检查当前用户 ====================
if [ "$(whoami)" != "root" ]; then
    log_error "必须以 root 用户执行此脚本"
    exit 1
fi

log_info "开始初始化 interview-handbook 服务器..."

# ==================== 步骤 2.1: 系统更新 + 基础包 ====================
log_info "[2.1] 更新系统并安装基础包..."
apt update && apt upgrade -y
apt install -y curl wget git vim ufw fail2ban nginx certbot python3-certbot-nginx openssl

# 验证
if ! command -v nginx &> /dev/null; then
    log_error "Nginx 安装失败"
    exit 1
fi
if ! command -v certbot &> /dev/null; then
    log_error "Certbot 安装失败"
    exit 1
fi
log_info "[2.1] 基础包安装完成 ✓"

# ==================== 步骤 2.2: 创建 deploy 用户 ====================
log_info "[2.2] 创建 deploy 用户..."
if ! id "deploy" &>/dev/null; then
    adduser deploy --gecos "" --disabled-password
    echo "deploy:deploy123456" | chpasswd
    usermod -aG sudo deploy
    log_info "[2.2] deploy 用户已创建，密码: deploy123456"
else
    log_warn "[2.2] deploy 用户已存在，跳过"
fi

# ==================== 步骤 2.3: 安装 Node.js 20 (以 deploy 用户) ====================
log_info "[2.3] 安装 Node.js 20 LTS..."
su - deploy -c '
    if [ ! -d "$HOME/.nvm" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
    fi
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm alias default 20
'

# 验证
if ! su - deploy -c 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; node -v' | grep -q "v20"; then
    log_error "Node.js 20 安装失败"
    exit 1
fi
log_info "[2.3] Node.js 20 安装完成 ✓"

# ==================== 步骤 2.4: 安装 PM2 ====================
log_info "[2.4] 安装 PM2..."
su - deploy -c '
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    npm install -g pm2
'

if ! su - deploy -c 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; pm2 --version' | grep -q "[0-9]\+\.[0-9]\+"; then
    log_error "PM2 安装失败"
    exit 1
fi
log_info "[2.4] PM2 安装完成 ✓"

# ==================== 步骤 2.5: 配置防火墙 ====================
log_info "[2.5] 配置 UFW 防火墙..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 'Nginx Full'
ufw --force enable

if ! ufw status | grep -q "Status: active"; then
    log_error "UFW 启动失败"
    exit 1
fi
log_info "[2.5] UFW 防火墙配置完成 ✓"

# ==================== 步骤 2.6: 配置 fail2ban ====================
log_info "[2.6] 配置 fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
EOF

systemctl enable fail2ban
systemctl start fail2ban

if ! systemctl is-active --quiet fail2ban; then
    log_error "fail2ban 启动失败"
    exit 1
fi
log_info "[2.6] fail2ban 配置完成 ✓"

# ==================== 步骤 3.1: 创建部署目录 + 拉取代码 ====================
log_info "[3.1] 创建部署目录并拉取代码..."
mkdir -p /var/www
chown deploy:deploy /var/www

su - deploy -c '
    cd /var/www
    if [ ! -d "interview-handbook" ]; then
        git clone https://github.com/xueca/interview-handbook.git
    fi
    cd interview-handbook
    git checkout reborn
    git pull origin reborn
'

if [ ! -f "$APP_DIR/backend/app.js" ]; then
    log_error "代码拉取失败，backend/app.js 不存在"
    exit 1
fi
log_info "[3.1] 代码拉取完成 ✓"

# ==================== 步骤 3.2: 创建生产环境变量 ====================
log_info "[3.2] 创建生产环境变量..."
JWT_SECRET=$(openssl rand -hex 32)

# 提示用户输入 DeepSeek API Key
read -p "请输入你的 DeepSeek API Key: " DEEPSEEK_API_KEY

if [ -z "$DEEPSEEK_API_KEY" ]; then
    log_error "DeepSeek API Key 不能为空"
    exit 1
fi

cat > "$APP_DIR/backend/.env.production.active" << EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=$JWT_SECRET
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
EOF

chown deploy:deploy "$APP_DIR/backend/.env.production.active"
chmod 600 "$APP_DIR/backend/.env.production.active"

log_info "[3.2] 环境变量已创建 ✓"
log_info "JWT_SECRET: $JWT_SECRET"
log_warn "请保存好 JWT_SECRET，丢失后需要重新生成"

# ==================== 步骤 3.4: 安装后端依赖 ====================
log_info "[3.4] 安装后端依赖..."
su - deploy -c "
    export NVM_DIR=\"\$HOME/.nvm\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\"
    cd $APP_DIR/backend
    npm ci --production
"

if [ ! -d "$APP_DIR/backend/node_modules/express" ]; then
    log_error "后端依赖安装失败"
    exit 1
fi
log_info "[3.4] 后端依赖安装完成 ✓"

# ==================== 步骤 3.5: 创建 PM2 日志目录 ====================
log_info "[3.5] 创建 PM2 日志目录..."
mkdir -p "$LOG_DIR"
chown -R deploy:deploy "$LOG_DIR"

# ==================== 修复 ecosystem.config.js (去掉 env_file) ====================
log_info "修复 ecosystem.config.js..."
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'interview-handbook-api',
    script: './backend/app.js',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      JWT_SECRET: '$JWT_SECRET',
      DEEPSEEK_API_KEY: '$DEEPSEEK_API_KEY'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '$LOG_DIR/interview-handbook-error.log',
    out_file: '$LOG_DIR/interview-handbook-out.log',
    merge_logs: true,
    max_memory_restart: '512M',
    restart_delay: 3000,
    min_uptime: '10s',
    max_restarts: 5,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF

chown deploy:deploy "$APP_DIR/ecosystem.config.js"
log_info "ecosystem.config.js 已修复 ✓"

# ==================== 步骤 3.6: 启动 PM2 ====================
log_info "[3.6] 启动 PM2..."
su - deploy -c "
    export NVM_DIR=\"\$HOME/.nvm\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\"
    cd $APP_DIR
    pm2 start ecosystem.config.js --env production
"

sleep 3

# 验证 PM2 状态
if ! su - deploy -c '
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    pm2 status | grep -q "online"
'; then
    log_error "PM2 启动失败，查看日志:"
    su - deploy -c "
        export NVM_DIR=\"\$HOME/.nvm\"
        [ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\"
        pm2 logs interview-handbook-api --lines 20
    "
    exit 1
fi
log_info "[3.6] PM2 启动成功 ✓"

# ==================== 步骤 3.7: 验证后端 ====================
log_info "[3.7] 验证后端..."

# 健康检查
HEALTH=$(curl -s http://127.0.0.1:5000/ || true)
if echo "$HEALTH" | grep -q "Hello World"; then
    log_info "[3.7] 健康检查通过 ✓"
else
    log_error "[3.7] 健康检查失败，返回: $HEALTH"
    exit 1
fi

# 登录 API 测试
LOGIN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' || true)
if echo "$LOGIN" | grep -q "error"; then
    log_info "[3.7] 登录 API 正常 ✓ (返回错误信息是预期的，因为用户不存在)"
else
    log_warn "[3.7] 登录 API 返回异常: $LOGIN"
fi

log_info "后端部署完成！"

# ==================== 步骤 3.8: PM2 开机自启 ====================
log_info "[3.8] 设置 PM2 开机自启..."
STARTUP_CMD=$(su - deploy -c '
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    pm2 startup systemd 2>&1 | grep "sudo env PATH"
')

if [ -n "$STARTUP_CMD" ]; then
    eval "$STARTUP_CMD"
    su - deploy -c '
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        pm2 save
    '
    log_info "[3.8] PM2 开机自启设置完成 ✓"
else
    log_warn "[3.8] PM2 开机自启命令获取失败，请手动执行"
fi

# ==================== 步骤 4.1: 构建前端 ====================
log_info "[4.1] 构建前端..."
su - deploy -c "
    export NVM_DIR=\"\$HOME/.nvm\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\"
    cd $APP_DIR/frontend
    npm ci
    npm run build
"

if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
    log_error "前端构建失败"
    exit 1
fi
log_info "[4.1] 前端构建完成 ✓"

# ==================== 步骤 4.2-4.3: 配置 Nginx ====================
log_info "[4.2-4.3] 配置 Nginx..."

# 获取公网 IP
PUBLIC_IP=$(curl -s ifconfig.me || echo "your-server-ip")

cp "$APP_DIR/nginx/interview-handbook.conf" /etc/nginx/sites-available/interview-handbook
sed -i "s/your-domain.com www.your-domain.com/$PUBLIC_IP/" /etc/nginx/sites-available/interview-handbook

ln -sf /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

if ! systemctl is-active --quiet nginx; then
    log_error "Nginx 启动失败"
    exit 1
fi
log_info "[4.2-4.3] Nginx 配置完成 ✓"

# ==================== 完成 ====================
log_info "========================================"
log_info "初始化完成！"
log_info "========================================"
log_info "公网访问地址: http://$PUBLIC_IP"
log_info "PM2 状态: 运行中"
log_info "Nginx 状态: 运行中"
log_info ""
log_warn "重要提醒:"
log_warn "1. 请修改 deploy 用户的默认密码: passwd deploy"
log_warn "2. 请保存 JWT_SECRET: $JWT_SECRET"
log_warn "3. 如果配置了域名，请手动修改 Nginx 配置并运行 certbot"
log_warn "4. 建议配置 SSH 密钥登录后禁用密码登录"
log_info ""
log_info "常用命令:"
log_info "  pm2 status          # 查看进程状态"
log_info "  pm2 logs            # 查看日志"
log_info "  pm2 restart all     # 重启所有服务"
log_info "  sudo nginx -t       # 检查 Nginx 配置"
log_info "  sudo systemctl status nginx  # 查看 Nginx 状态"
