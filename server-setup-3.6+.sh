#!/bin/bash
# 文件功能: interview-handbook 从步骤 3.6 开始的自动化脚本 | 数据流: deploy → 启动后端 → 构建前端 → Nginx → 验证
# 前置条件: 步骤 3.6 之前全部完成（服务器初始化、代码拉取、环境变量、依赖安装）
# 使用方式: 以 deploy 用户执行: bash server-setup-3.6+.sh
# 执行后进度: 阶段四完成（Day31），到达步骤 4.3，下一步是 4.4（浏览器验证）

set -e

APP_DIR="/var/www/interview-handbook"
LOG_DIR="/var/log/pm2"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}
log_progress() {
    echo -e "\n${GREEN}▶ 当前进度: $1${NC}"
    echo -e "${GREEN}▶ 下一步: $2${NC}\n"
}

# ==================== 检查当前用户 ====================
if [ "$(whoami)" != "deploy" ]; then
    log_error "必须以 deploy 用户执行此脚本"
    log_error "请执行: su - deploy"
    exit 1
fi

# ==================== 检查前置条件 ====================
log_step "前置条件检查"

if [ ! -f "$APP_DIR/backend/.env.production.active" ]; then
    log_error "环境变量文件不存在: $APP_DIR/backend/.env.production.active"
    log_error "请先执行步骤 3.2 创建环境变量"
    exit 1
fi

if [ ! -d "$APP_DIR/backend/node_modules" ]; then
    log_error "后端依赖未安装: $APP_DIR/backend/node_modules 不存在"
    log_error "请先执行步骤 3.4: cd $APP_DIR/backend && npm ci --production"
    exit 1
fi

if [ ! -d "$LOG_DIR" ]; then
    log_warn "PM2 日志目录不存在，创建中..."
    sudo mkdir -p "$LOG_DIR"
    sudo chown -R deploy:deploy "$LOG_DIR"
fi

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v pm2 &> /dev/null; then
    log_error "PM2 未安装，请先执行步骤 2.4"
    exit 1
fi

log_info "前置条件检查通过 ✓"
log_progress "步骤 3.5 完成（前置条件就绪）" "步骤 3.6: 启动 PM2"

# ==================== 步骤 3.6: 启动 PM2 ====================
log_step "[3.6] 启动 PM2"

cd "$APP_DIR"

# 如果已有同名进程，先删除
if pm2 status | grep -q "interview-handbook-api"; then
    log_warn "发现已有 interview-handbook-api 进程，先删除..."
    pm2 delete interview-handbook-api
fi

# 从 .env.production.active 读取环境变量
JWT_SECRET=$(grep "^JWT_SECRET=" backend/.env.production.active | cut -d= -f2)
DEEPSEEK_API_KEY=$(grep "^DEEPSEEK_API_KEY=" backend/.env.production.active | cut -d= -f2)

if [ -z "$JWT_SECRET" ] || [ -z "$DEEPSEEK_API_KEY" ]; then
    log_error "环境变量读取失败，请检查 backend/.env.production.active"
    exit 1
fi

log_info "JWT_SECRET: ${JWT_SECRET:0:8}... (已隐藏)"
log_info "DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:0:8}... (已隐藏)"

# 启动 PM2（使用 env 注入环境变量）
pm2 start backend/app.js --name interview-handbook-api \
  --env NODE_ENV=production \
  --env PORT=5000 \
  --env JWT_SECRET="$JWT_SECRET" \
  --env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY"

sleep 3

# 验证 PM2 状态
PM2_STATUS=$(pm2 status | grep interview-handbook-api | awk '{print $10}')
if [ "$PM2_STATUS" != "online" ]; then
    log_error "PM2 启动失败，状态: $PM2_STATUS"
    log_error "查看日志:"
    pm2 logs interview-handbook-api --lines 30
    exit 1
fi

log_info "PM2 启动成功，状态: online ✓"
log_progress "步骤 3.6 完成（PM2 已启动）" "步骤 3.7: 验证后端"

# ==================== 步骤 3.7: 验证后端 ====================
log_step "[3.7] 验证后端"

# 健康检查
HEALTH=$(curl -s http://127.0.0.1:5000/ || true)
if echo "$HEALTH" | grep -q "Hello World"; then
    log_info "健康检查通过: $HEALTH ✓"
else
    log_error "健康检查失败，返回: $HEALTH"
    log_error "查看日志: pm2 logs interview-handbook-api --lines 20"
    exit 1
fi

# 登录 API 测试
LOGIN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' || true)
if echo "$LOGIN" | grep -q "error"; then
    log_info "登录 API 正常 (返回错误信息是预期的，因为用户不存在) ✓"
else
    log_warn "登录 API 返回异常: $LOGIN"
fi

# SSE 接口测试
log_info "测试 SSE 流式接口 (等待 5 秒)..."
SSE_OUTPUT=$(curl -s -N -H "Accept: text/event-stream" \
    -H "Content-Type: application/json" \
    -d '{"question":"hello"}' \
    http://127.0.0.1:5000/api/ai/chat/stream \
    -m 5 || true)

if echo "$SSE_OUTPUT" | grep -q "data:"; then
    log_info "SSE 接口正常 (收到流式数据) ✓"
else
    log_warn "SSE 接口测试未收到预期数据，可能需要配置 API Key"
fi

log_progress "步骤 3.7 完成（后端验证通过）" "步骤 3.8: PM2 开机自启"

# ==================== 步骤 3.8: PM2 开机自启 ====================
log_step "[3.8] 设置 PM2 开机自启"

STARTUP_CMD=$(pm2 startup systemd 2>&1 | grep "sudo env PATH")

if [ -n "$STARTUP_CMD" ]; then
    log_info "执行 PM2 开机自启命令..."
    eval "$STARTUP_CMD"
    pm2 save
    log_info "PM2 开机自启设置完成 ✓"
else
    log_warn "PM2 开机自启命令获取失败，请手动执行: pm2 startup systemd"
fi

log_progress "步骤 3.8 完成（PM2 开机自启已设置）" "步骤 4.1: 构建前端"

# ==================== 步骤 4.1: 构建前端 ====================
log_step "[4.1] 构建前端"

cd "$APP_DIR/frontend"
npm ci
npm run build

if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
    log_error "前端构建失败，dist/index.html 不存在"
    exit 1
fi

log_info "前端构建完成 ✓"
log_info "构建产物:"
ls -la "$APP_DIR/frontend/dist/"

log_progress "步骤 4.1 完成（前端已构建）" "步骤 4.2-4.3: 配置 Nginx"

# ==================== 步骤 4.2-4.3: 配置 Nginx ====================
log_step "[4.2-4.3] 配置 Nginx"

# 获取公网 IP
PUBLIC_IP=$(curl -s ifconfig.me || echo "")

if [ -z "$PUBLIC_IP" ]; then
    log_warn "无法自动获取公网 IP，请手动输入"
    read -p "请输入服务器公网 IP: " PUBLIC_IP
fi

log_info "公网 IP: $PUBLIC_IP"

# 复制并修改 Nginx 配置
sudo cp "$APP_DIR/nginx/interview-handbook.conf" /etc/nginx/sites-available/interview-handbook
sudo sed -i "s/your-domain.com www.your-domain.com/$PUBLIC_IP/" /etc/nginx/sites-available/interview-handbook

# 验证配置内容
if ! sudo grep -q "proxy_buffering off;" /etc/nginx/sites-available/interview-handbook; then
    log_error "Nginx 配置中缺少 proxy_buffering off，请检查"
    exit 1
fi

log_info "Nginx 配置已复制并修改 ✓"

# 启用站点
sudo ln -sf /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 检查语法并重启
sudo nginx -t
sudo systemctl restart nginx

if ! systemctl is-active --quiet nginx; then
    log_error "Nginx 启动失败"
    exit 1
fi

log_info "Nginx 启动成功 ✓"
log_progress "步骤 4.3 完成（Nginx 已配置）" "步骤 4.4: 浏览器验证"

# ==================== 最终验证 ====================
log_step "最终验证"

# 本地 curl 测试
LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ || echo "000")
if [ "$LOCAL_TEST" = "200" ]; then
    log_info "本地访问测试通过 (HTTP 200) ✓"
else
    log_warn "本地访问测试返回 HTTP $LOCAL_TEST"
fi

# 公网 curl 测试
PUBLIC_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://$PUBLIC_IP/" || echo "000")
if [ "$PUBLIC_TEST" = "200" ]; then
    log_info "公网访问测试通过 (HTTP 200) ✓"
else
    log_warn "公网访问测试返回 HTTP $PUBLIC_TEST"
    log_warn "如果返回 000，可能是安全组未开放 80 端口"
fi

# ==================== 完成 ====================
log_step "部署完成！"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  interview-handbook 部署成功！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
log_info "公网访问地址: http://$PUBLIC_IP"
log_info "后端本地地址: http://127.0.0.1:5000"
echo ""
log_info "常用命令:"
echo "  pm2 status                          # 查看进程状态"
echo "  pm2 logs interview-handbook-api     # 查看应用日志"
echo "  pm2 restart interview-handbook-api  # 重启后端"
echo "  sudo nginx -t                       # 检查 Nginx 配置"
echo "  sudo systemctl status nginx         # 查看 Nginx 状态"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  脚本执行后进度说明${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓ 已完成步骤:${NC}"
echo "  3.6  启动 PM2"
echo "  3.7  验证后端"
echo "  3.8  PM2 开机自启"
echo "  4.1  构建前端"
echo "  4.2  配置 Nginx"
echo "  4.3  启用站点 + 重启 Nginx"
echo ""
echo -e "${YELLOW}⏳ 下一步（需手动完成）:${NC}"
echo "  4.4  浏览器验证 — 在浏览器打开 http://$PUBLIC_IP"
echo "  4.5  全流程测试 — 注册/登录/答题/AI/SSE"
echo ""
echo -e "${YELLOW}📋 后续阶段（可选）:${NC}"
echo "  阶段五: 配置域名 + HTTPS（如有域名）"
echo "  阶段六: 线上 Bug 修复 + Demo 视频"
echo "  阶段七: README + 踩坑记录"
echo "  阶段八: 更新简历"
echo ""
echo -e "${GREEN}当前总体进度: 阶段四完成（Day31）${NC}"
echo ""
