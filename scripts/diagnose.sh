#!/bin/bash
# 文件功能: 服务器全面诊断脚本 | 用途: bash scripts/diagnose.sh
# 检查: Git/环境变量/后端/前端/Nginx/权限/日志 → 输出修复优先级

set -e

# ─── 颜色 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ─── 计数器 ───
TOTAL=0
PASS=0
FAIL=0

ok()   { echo -e "  ${GREEN}✅${NC} $1"; PASS=$((PASS+1)); }
warn() { echo -e "  ${YELLOW}⚠️${NC} $1"; }
fail() { echo -e "  ${RED}❌${NC} $1"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL-1)); }
info() { echo -e "  ${CYAN}ℹ️${NC}  $1"; }
sep()  { echo -e "  ${CYAN}────────────────────────────────────────${NC}"; }
blank(){ echo ""; }

APP_DIR="/var/www/interview-handbook"
HOSTNAME=$(hostname)

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  面试宝典 — 服务器全面诊断报告${NC}"
echo -e "${BOLD}  服务器: $HOSTNAME${NC}"
echo -e "${BOLD}  时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""

# ═══════════════════════════════════════
#  检查项 1：Git 状态
# ═══════════════════════════════════════
echo -e "${BOLD}[1/8] Git 状态${NC}"
TOTAL=$((TOTAL+1))
cd "$APP_DIR" 2>/dev/null || {
  fail "项目目录不存在: $APP_DIR"
  info "建议: git clone https://github.com/xueca/interview-handbook.git"
  blank
  # 跳过后续所有检查
  echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  诊断提前终止 — 项目目录不存在${NC}"
  echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
  exit 1
}
TOTAL=$((TOTAL-1))

# 检查 Git 仓库
if [ -d .git ]; then
  ok "Git 仓库存在"
  TOTAL=$((TOTAL+1))
else
  fail "Git 仓库不存在（不是 git 仓库）"
  info "建议: git init && git remote add origin https://github.com/xueca/interview-handbook.git"
  blank; return 1
fi

# 分支
BRANCH=$(git branch --show-current 2>/dev/null)
if [ "$BRANCH" = "reborn" ]; then
  ok "当前分支: $BRANCH"
elif [ -n "$BRANCH" ]; then
  warn "当前分支: $BRANCH（预期: reborn）"
else
  fail "无法获取当前分支（可能是 detached HEAD）"
fi

# 最新 commit
COMMIT=$(git log --oneline -1 2>/dev/null)
if [ -n "$COMMIT" ]; then
  ok "最新 commit: $COMMIT"
else
  fail "无法获取 commit 信息"
fi

# 本地未提交修改
MODIFIED=$(git status --short 2>/dev/null)
if [ -n "$MODIFIED" ]; then
  warn "有本地未提交的修改:"
  echo "$MODIFIED" | while IFS= read -r line; do
    echo "    $line"
  done
else
  ok "工作区干净，无本地修改"
fi

# 与远程对比
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/reborn 2>/dev/null)
if [ -n "$LOCAL" ] && [ -n "$REMOTE" ]; then
  if [ "$LOCAL" = "$REMOTE" ]; then
    ok "本地与远程 reborn 一致"
  else
    warn "本地与远程不一致（本地落后远程）"
    info "建议: git stash && git pull origin reborn"
  fi
fi

# ecosystem.config.js 是否正确
if [ -f "ecosystem.config.js" ]; then
  ENV_LINE=$(grep "env_file" ecosystem.config.js 2>/dev/null)
  if echo "$ENV_LINE" | grep -q ".env.production.active"; then
    ok "ecosystem.config.js 指向 .env.production.active"
  else
    warn "ecosystem.config.js 中的 env_file 可能指向错误路径: $ENV_LINE"
    info "建议: 确认 env_file 为 '.env.production.active'"
  fi
fi

blank

# ═══════════════════════════════════════
#  检查项 2：环境变量
# ═══════════════════════════════════════
echo -e "${BOLD}[2/8] 环境变量${NC}"
TOTAL=$((TOTAL+1))

if [ -f "backend/.env.production.active" ]; then
  ok ".env.production.active 文件存在"
else
  fail ".env.production.active 文件不存在"
  info "建议: cp backend/.env.production.example backend/.env.production.active && vim backend/.env.production.active"
fi

if [ -f "backend/.env.production.active" ]; then
  JWT=$(grep "^JWT_SECRET=" backend/.env.production.active 2>/dev/null | cut -d= -f2)
  if [ -z "$JWT" ]; then
    fail "JWT_SECRET 为空"
  elif echo "$JWT" | grep -q "<"; then
    fail "JWT_SECRET 仍为占位符（未替换真实值）"
    info "建议: vim backend/.env.production.active，将 JWT_SECRET 替换为真实值"
    info "   生成命令: openssl rand -hex 32"
  else
    ok "JWT_SECRET 已配置"
  fi

  API_KEY=$(grep "^DEEPSEEK_API_KEY=" backend/.env.production.active 2>/dev/null | cut -d= -f2)
  if [ -z "$API_KEY" ]; then
    fail "DEEPSEEK_API_KEY 为空"
  elif echo "$API_KEY" | grep -q "<"; then
    fail "DEEPSEEK_API_KEY 仍为占位符"
    info "建议: vim backend/.env.production.active，填入真实 DeepSeek API Key"
  else
    ok "DEEPSEEK_API_KEY 已配置"
  fi
fi

blank

# ═══════════════════════════════════════
#  检查项 3：后端运行时
# ═══════════════════════════════════════
echo -e "${BOLD}[3/8] 后端运行时${NC}"
TOTAL=$((TOTAL+1))

# PM2 进程
PM2_PID=$(pm2 pid interview-handbook-api 2>/dev/null || echo "0")
if [ "$PM2_PID" != "0" ] && [ -n "$PM2_PID" ]; then
  ok "PM2 进程运行中 (PID: $PM2_PID)"
  PM2_STATUS=$(pm2 show interview-handbook-api 2>/dev/null | grep "status" | awk '{print $NF}')
  if [ "$PM2_STATUS" = "online" ]; then
    ok "PM2 状态: online"
  else
    warn "PM2 状态: $PM2_STATUS（预期: online）"
  fi
else
  fail "PM2 进程未运行"
  info "建议: cd $APP_DIR && pm2 start ecosystem.config.js --env production"
fi

# PM2 开机自启
if pm2 startup 2>/dev/null | grep -q "already"; then
  ok "PM2 开机自启已配置"
else
  warn "PM2 开机自启未配置（重启服务器后 PM2 不会自动启动）"
  info "建议: pm2 startup systemd && pm2 save"
fi

# 5000 端口监听
if ss -tlnp 2>/dev/null | grep -q ":5000 "; then
  ok "后端端口 5000 正在监听"
else
  fail "后端端口 5000 未监听"
  info "建议: cd $APP_DIR && pm2 logs interview-handbook-api --lines 20 查看后端启动日志"
fi

# 后端健康检查
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:5000/ 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  ok "后端健康检查通过 (HTTP $HEALTH)"
elif [ "$HEALTH" = "000" ]; then
  fail "后端健康检查失败（连接超时或被拒绝）"
  info "建议: 检查 PM2 日志: pm2 logs interview-handbook-api --lines 30"
else
  warn "后端返回异常 HTTP $HEALTH"
  info "建议: curl -v http://127.0.0.1:5000/ 查看详细响应"
fi

# 后端依赖
if [ -d "backend/node_modules" ]; then
  ok "后端 node_modules 存在"
else
  warn "后端 node_modules 不存在"
  info "建议: cd backend && npm ci --production"
fi

blank

# ═══════════════════════════════════════
#  检查项 4：前端构建
# ═══════════════════════════════════════
echo -e "${BOLD}[4/8] 前端构建${NC}"
TOTAL=$((TOTAL+1))

if [ -f "frontend/dist/index.html" ]; then
  ok "前端构建产物存在 (frontend/dist/index.html)"
  DIST_SIZE=$(du -sh frontend/dist/ 2>/dev/null | awk '{print $1}')
  info "dist 目录大小: $DIST_SIZE"
else
  fail "前端构建产物缺失 (frontend/dist/index.html)"
  info "建议: cd frontend && npm ci && npm run build"
fi

if [ -d "frontend/node_modules" ]; then
  ok "前端 node_modules 存在"
else
  warn "前端 node_modules 不存在"
  info "建议: cd frontend && npm ci"
fi

blank

# ═══════════════════════════════════════
#  检查项 5：Nginx
# ═══════════════════════════════════════
echo -e "${BOLD}[5/8] Nginx${NC}"
TOTAL=$((TOTAL+1))

# Nginx 是否安装
if command -v nginx &>/dev/null; then
  ok "Nginx 已安装 ($(nginx -v 2>&1 | awk '{print $NF}'))"
else
  fail "Nginx 未安装"
  info "建议: sudo apt install -y nginx"
fi

# Nginx 是否运行
if systemctl is-active nginx &>/dev/null; then
  ok "Nginx 服务运行中"
else
  fail "Nginx 服务未运行"
  info "建议: sudo systemctl restart nginx && sudo journalctl -u nginx --no-pager -n 20"
fi

# 80 端口监听
if ss -tlnp 2>/dev/null | grep -q ":80 "; then
  ok "HTTP 端口 80 正在监听"
else
  fail "HTTP 端口 80 未监听"
  info "建议: sudo nginx -t 检查语法，sudo systemctl restart nginx"
fi

# 站点配置是否存在
if [ -f "/etc/nginx/sites-available/interview-handbook" ]; then
  ok "Nginx 配置存在 (/etc/nginx/sites-available/interview-handbook)"
  # 检查 server_name
  SN=$(grep "server_name" /etc/nginx/sites-available/interview-handbook 2>/dev/null | head -1)
  info "server_name: $SN"
else
  fail "Nginx 配置缺失 (/etc/nginx/sites-available/interview-handbook)"
  info "建议: bash scripts/setup-nginx-ip.sh 8.138.219.100"
fi

# 站点是否启用（软链接存在）
if [ -L "/etc/nginx/sites-enabled/interview-handbook" ]; then
  ok "站点已启用 (软链接存在)"
else
  fail "站点未启用（无软链接）"
  info "建议: sudo ln -sf /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/"
  info "   sudo rm -f /etc/nginx/sites-enabled/default"
fi

# default 站点是否冲突
if [ -f "/etc/nginx/sites-enabled/default" ] || [ -L "/etc/nginx/sites-enabled/default" ]; then
  warn "default 站点仍启用，可能与自定义站点冲突"
  info "建议: sudo rm -f /etc/nginx/sites-enabled/default"
else
  ok "已无 default 站点冲突"
fi

# Nginx 配置语法
if sudo nginx -t 2>&1 | grep -q "successful\|ok"; then
  ok "Nginx 配置语法正确"
else
  fail "Nginx 配置语法错误"
  info "建议: sudo nginx -t 查看详细错误"
fi

# Nginx 代理测试（通过 80 访问后端）
PROXY=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1/ 2>/dev/null || echo "000")
if [ "$PROXY" = "200" ]; then
  ok "Nginx 代理正常 (HTTP $PROXY)"
elif [ "$PROXY" = "000" ]; then
  fail "Nginx 代理失败（连接超时）"
elif [ "$PROXY" = "302" ] || [ "$PROXY" = "301" ]; then
  warn "Nginx 返回 $PROXY 重定向"
else
  warn "Nginx 返回 HTTP $PROXY"
  info "建议: curl -v http://127.0.0.1/ 查看详细响应"
fi

blank

# ═══════════════════════════════════════
#  检查项 6：文件权限
# ═══════════════════════════════════════
echo -e "${BOLD}[6/8] 文件权限${NC}"
TOTAL=$((TOTAL+1))

# 当前用户
info "当前用户: $(whoami)"

# backend/data 目录
if [ -d "backend/data" ]; then
  DATA_OWNER=$(stat -c "%U" backend/data/ 2>/dev/null || stat -f "%Su" backend/data/ 2>/dev/null)
  ok "backend/data/ 目录所有者: $DATA_OWNER"

  if [ -w "backend/data/" ]; then
    ok "backend/data/ 可写"
  else
    fail "backend/data/ 不可写（后端无法写入答题记录等数据）"
    info "建议: sudo chown -R deploy:deploy backend/data/"
  fi
else
  fail "backend/data/ 目录不存在"
fi

# frontend/dist 可读
if [ -f "frontend/dist/index.html" ]; then
  if sudo -u www-data test -r "frontend/dist/index.html" 2>/dev/null; then
    ok "Nginx 用户 (www-data) 可读取 frontend/dist/"
  else
    warn "Nginx 用户可能无法读取 frontend/dist/"
    info "建议: sudo chmod -R 755 frontend/dist/"
  fi
else
  info "frontend/dist/ 不存在，跳过 Nginx 可读性检查"
fi

# .env.production.active 权限
if [ -f "backend/.env.production.active" ]; then
  ENV_PERMS=$(stat -c "%a" backend/.env.production.active 2>/dev/null || stat -f "%OLp" backend/.env.production.active 2>/dev/null)
  info ".env.production.active 权限: $ENV_PERMS（建议 600 仅所有者可读）"
  if [ "$ENV_PERMS" = "600" ]; then
    ok ".env.production.active 权限正确"
  else
    warn ".env.production.active 权限建议设为 600"
    info "建议: chmod 600 backend/.env.production.active"
  fi
fi

blank

# ═══════════════════════════════════════
#  检查项 7：日志摘要
# ═══════════════════════════════════════
echo -e "${BOLD}[7/8] 日志摘要（最后 15 行）${NC}"
TOTAL=$((TOTAL+1))

# PM2 日志
if [ -f "/var/log/pm2/interview-handbook-error.log" ]; then
  info "PM2 错误日志 (最后 15 行):"
  tail -15 /var/log/pm2/interview-handbook-error.log 2>/dev/null | while IFS= read -r line; do
    echo "    $line"
  done
else
  info "PM2 错误日志不存在（可能尚未记录错误）"
  info "尝试获取 PM2 最近日志:"
  pm2 logs interview-handbook-api --lines 15 --nostream 2>/dev/null || info "PM2 没有日志输出"
fi

blank

# Nginx 错误日志
if [ -f "/var/log/nginx/error.log" ]; then
  info "Nginx 错误日志 (最后 15 行):"
  sudo tail -15 /var/log/nginx/error.log 2>/dev/null | while IFS= read -r line; do
    echo "    $line"
  done
else
  info "Nginx 错误日志不存在"
fi

blank

# ═══════════════════════════════════════
#  检查项 8：外部访问验证
# ═══════════════════════════════════════
echo -e "${BOLD}[8/8] 外部访问验证${NC}"
TOTAL=$((TOTAL+1))

# UFW 状态
if command -v ufw &>/dev/null; then
  UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
  info "防火墙状态: $UFW_STATUS"
  if sudo ufw status 2>/dev/null | grep -q "80.*ALLOW"; then
    ok "HTTP 端口 80 已放行"
  else
    warn "HTTP 端口 80 可能未放行"
    info "建议: sudo ufw allow 'Nginx Full'"
  fi
fi

# 安全组提醒
info "提醒: 阿里云安全组需要开放 80 端口"
info "      控制台 → 安全组 → 添加入方向规则: TCP:80"

blank

# ═══════════════════════════════════════
#  综合诊断结论
# ═══════════════════════════════════════
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  诊断结论${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"

# 重新统计各检查结果
blank
echo "  详细诊断结果已在上面列出，请根据 ❌ 和 ⚠️ 的提示修复。"

# 汇总快速建议
blank
echo -e "${BOLD}  快速修复命令（按需执行）:${NC}"
blank
echo "  # 1. 拉取最新代码"
echo "  git stash && git pull origin reborn"
blank
echo "  # 2. 编辑环境变量"
echo "  cd $APP_DIR/backend"
echo "  vim .env.production.active"
echo "  # 填入 JWT_SECRET（openssl rand -hex 32）和 DEEPSEEK_API_KEY"
blank
echo "  # 3. 构建前端"
echo "  cd $APP_DIR/frontend"
echo "  npm ci && npm run build"
blank
echo "  # 4. 重启后端"
echo "  cd $APP_DIR"
echo "  pm2 delete interview-handbook-api; pm2 start ecosystem.config.js --env production; pm2 save"
blank
echo "  # 5. 配置 Nginx"
echo "  cd $APP_DIR && bash scripts/setup-nginx-ip.sh 8.138.219.100"
blank
echo "  # 6. 最终验证"
echo "  curl http://127.0.0.1:5000/   # 后端"
echo "  curl http://8.138.219.100/     # 前端"
blank

echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  诊断结束: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"