#!/bin/bash
# 文件功能: interview-handbook 服务器诊断脚本 | 数据流: 检查文件完整性 → 检查服务状态 → 输出诊断报告
# 使用方式: 以 deploy 用户执行: bash server-diagnose.sh
# 作用: 全面检查服务器上的文件是否缺失、代码是否完整、服务是否正常

# 不用 set -e，诊断脚本要跑完所有检查再报告

APP_DIR="/var/www/interview-handbook"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 计数器
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

log_pass() { echo -e "  ${GREEN}[✓]${NC} $1"; ((PASS_COUNT++)); }
log_fail() { echo -e "  ${RED}[✗]${NC} $1"; ((FAIL_COUNT++)); }
log_warn() { echo -e "  ${YELLOW}[!]${NC} $1"; ((WARN_COUNT++)); }
log_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  interview-handbook 服务器诊断工具 v1.0  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

# ==================== 1. 基础环境检查 ====================
log_section "1. 基础环境检查"

# 检查当前用户
CURRENT_USER=$(whoami)
if [ "$CURRENT_USER" = "deploy" ]; then
    log_pass "当前用户: deploy"
elif [ "$CURRENT_USER" = "root" ]; then
    log_warn "当前用户: root（建议用 deploy 用户操作应用层）"
else
    log_warn "当前用户: $CURRENT_USER（建议用 deploy 用户）"
fi

# 检查项目目录
if [ -d "$APP_DIR" ]; then
    log_pass "项目目录存在: $APP_DIR"
else
    log_fail "项目目录不存在: $APP_DIR"
    echo -e "  ${RED}→ 请先执行: sudo mkdir -p /var/www && sudo chown deploy:deploy /var/www${NC}"
    echo -e "  ${RED}→ 然后: cd /var/www && git clone https://github.com/xueca/interview-handbook.git${NC}"
    # 目录都不存在，后面没法检查了
    echo -e "\n${RED}项目目录不存在，诊断终止。请先拉取代码。${NC}"
    exit 1
fi

# 检查 Git 分支
cd "$APP_DIR"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
if [ "$BRANCH" = "reborn" ]; then
    log_pass "Git 分支: reborn"
else
    log_fail "Git 分支: $BRANCH（应为 reborn）"
    echo -e "  ${RED}→ 请执行: git checkout reborn${NC}"
fi

# 检查 Git 是否有未提交修改
GIT_DIRTY=$(git status --porcelain 2>/dev/null | head -1)
if [ -z "$GIT_DIRTY" ]; then
    log_pass "Git 工作区干净"
else
    log_warn "Git 有未提交的修改（可能本地改了文件）"
    echo -e "  ${YELLOW}→ 如需恢复: git checkout .${NC}"
fi

# ==================== 2. 后端文件完整性检查 ====================
log_section "2. 后端文件完整性检查"

# 后端关键文件清单
BACKEND_FILES=(
    "backend/app.js"
    "backend/package.json"
    "backend/package-lock.json"
    "backend/.env.production"
    "backend/.env.production.active"
    "backend/routes/auth.js"
    "backend/routes/questions.js"
    "backend/routes/records.js"
    "backend/routes/ai.js"
    "backend/controllers/authController.js"
    "backend/controllers/questionController.js"
    "backend/controllers/recordController.js"
    "backend/controllers/aiController.js"
    "backend/controllers/chatController.js"
    "backend/controllers/aiPrompt.js"
    "backend/controllers/aiParser.js"
    "backend/middleware/auth.js"
    "backend/middleware/rateLimit.js"
    "backend/services/deepseekService.js"
    "backend/utils/validator.js"
    "backend/data/index.js"
    "backend/data/questions.json"
    "backend/data/users.json"
    "backend/data/records.json"
    "backend/data/marks.json"
)

BACKEND_MISSING=0
for f in "${BACKEND_FILES[@]}"; do
    if [ -f "$APP_DIR/$f" ]; then
        log_pass "$f"
    else
        log_fail "$f 缺失"
        ((BACKEND_MISSING++))
    fi
done

# 检查 .env.production.active 内容
if [ -f "$APP_DIR/backend/.env.production.active" ]; then
    log_section "2.1 环境变量内容检查"

    ENV_JWT=$(grep "^JWT_SECRET=" "$APP_DIR/backend/.env.production.active" | cut -d= -f2)
    ENV_KEY=$(grep "^DEEPSEEK_API_KEY=" "$APP_DIR/backend/.env.production.active" | cut -d= -f2)
    ENV_PORT=$(grep "^PORT=" "$APP_DIR/backend/.env.production.active" | cut -d= -f2)
    ENV_NODE=$(grep "^NODE_ENV=" "$APP_DIR/backend/.env.production.active" | cut -d= -f2)

    if [ -n "$ENV_JWT" ] && [ ${#ENV_JWT} -ge 32 ]; then
        log_pass "JWT_SECRET 已设置 (长度: ${#ENV_JWT})"
    elif [ -n "$ENV_JWT" ]; then
        log_warn "JWT_SECRET 过短 (长度: ${#ENV_JWT}，建议 64 字符)"
    else
        log_fail "JWT_SECRET 未设置"
        echo -e "  ${RED}→ 请执行: openssl rand -hex 32 然后写入 .env.production.active${NC}"
    fi

    if [ -n "$ENV_KEY" ]; then
        log_pass "DEEPSEEK_API_KEY 已设置 (${ENV_KEY:0:8}...)"
    else
        log_fail "DEEPSEEK_API_KEY 未设置"
        echo -e "  ${RED}→ 请在 .env.production.active 中添加 DEEPSEEK_API_KEY=sk-xxx${NC}"
    fi

    if [ "$ENV_PORT" = "5000" ]; then
        log_pass "PORT=5000"
    else
        log_warn "PORT=$ENV_PORT（默认应为 5000）"
    fi

    if [ "$ENV_NODE" = "production" ]; then
        log_pass "NODE_ENV=production"
    else
        log_warn "NODE_ENV=$ENV_NODE（应为 production）"
    fi
fi

# 检查后端依赖
log_section "2.2 后端依赖检查"
if [ -d "$APP_DIR/backend/node_modules" ]; then
    log_pass "node_modules 目录存在"
    # 检查关键依赖
    for pkg in express cors dotenv jsonwebtoken bcryptjs axios; do
        if [ -d "$APP_DIR/backend/node_modules/$pkg" ]; then
            log_pass "依赖已安装: $pkg"
        else
            log_fail "依赖缺失: $pkg"
            echo -e "  ${RED}→ 请执行: cd backend && npm ci --production${NC}"
        fi
    done
else
    log_fail "backend/node_modules 不存在"
    echo -e "  ${RED}→ 请执行: cd backend && npm ci --production${NC}"
fi

# ==================== 3. 前端文件完整性检查 ====================
log_section "3. 前端文件完整性检查"

FRONTEND_FILES=(
    "frontend/package.json"
    "frontend/package-lock.json"
    "frontend/vite.config.js"
    "frontend/index.html"
    "frontend/src/main.js"
    "frontend/src/App.vue"
    "frontend/src/style.css"
    "frontend/src/router/index.js"
    "frontend/src/api/request.js"
    "frontend/src/api/auth.js"
    "frontend/src/api/questions.js"
    "frontend/src/api/records.js"
    "frontend/src/api/ai.js"
    "frontend/src/api/sse.js"
    "frontend/src/stores/user.js"
    "frontend/src/stores/questions.js"
    "frontend/src/stores/record.js"
    "frontend/src/views/Login.vue"
    "frontend/src/views/Dashboard.vue"
    "frontend/src/views/QuestionBank.vue"
    "frontend/src/views/QuestionDetail.vue"
    "frontend/src/views/Quiz.vue"
    "frontend/src/views/QuizResult.vue"
    "frontend/src/views/WrongBook.vue"
    "frontend/src/views/AiChat.vue"
    "frontend/src/views/Profile.vue"
    "frontend/src/views/NotFound.vue"
    "frontend/src/composables/useAiChat.js"
    "frontend/src/composables/useQuestionBank.js"
    "frontend/src/composables/useQuiz.js"
    "frontend/src/composables/useTimer.js"
    "frontend/src/composables/useWrongBook.js"
    "frontend/src/utils/validator.js"
    "frontend/src/utils/markdown.js"
    "frontend/src/utils/stats.js"
    "frontend/src/utils/timer.js"
    "frontend/src/utils/questionParser.js"
    "frontend/src/components/AiQuestionCard.vue"
    "frontend/src/constants/categories.js"
)

FRONTEND_MISSING=0
for f in "${FRONTEND_FILES[@]}"; do
    if [ -f "$APP_DIR/$f" ]; then
        log_pass "$f"
    else
        log_fail "$f 缺失"
        ((FRONTEND_MISSING++))
    fi
done

# 检查前端依赖
log_section "3.1 前端依赖检查"
if [ -d "$APP_DIR/frontend/node_modules" ]; then
    log_pass "node_modules 目录存在"
    for pkg in vue vue-router pinia element-plus echarts axios vite; do
        if [ -d "$APP_DIR/frontend/node_modules/$pkg" ]; then
            log_pass "依赖已安装: $pkg"
        else
            log_fail "依赖缺失: $pkg"
        fi
    done
else
    log_fail "frontend/node_modules 不存在"
    echo -e "  ${RED}→ 请执行: cd frontend && npm ci${NC}"
fi

# 检查前端构建产物
log_section "3.2 前端构建产物检查"
if [ -d "$APP_DIR/frontend/dist" ]; then
    log_pass "dist 目录存在"
    if [ -f "$APP_DIR/frontend/dist/index.html" ]; then
        log_pass "dist/index.html 存在"
    else
        log_fail "dist/index.html 不存在（构建可能失败）"
    fi
    DIST_JS_COUNT=$(find "$APP_DIR/frontend/dist" -name "*.js" 2>/dev/null | wc -l)
    if [ "$DIST_JS_COUNT" -gt 0 ]; then
        log_pass "dist 中有 $DIST_JS_COUNT 个 JS 文件"
    else
        log_fail "dist 中没有 JS 文件（构建可能失败）"
    fi
else
    log_warn "dist 目录不存在（前端尚未构建）"
    echo -e "  ${YELLOW}→ 请执行: cd frontend && npm run build${NC}"
fi

# ==================== 4. Vue 文件语法快速检查 ====================
log_section "4. Vue 文件标签闭合检查"

# 检查所有 .vue 文件的 <template> 标签是否闭合
VUE_FILES=$(find "$APP_DIR/frontend/src" -name "*.vue" 2>/dev/null)
VUE_ERROR_COUNT=0

for vue_file in $VUE_FILES; do
    REL_PATH=${vue_file#$APP_DIR/}

    # 检查 <template> 和 </template> 是否成对
    TEMPLATE_OPEN=$(grep -c "<template>" "$vue_file" 2>/dev/null || echo 0)
    TEMPLATE_CLOSE=$(grep -c "</template>" "$vue_file" 2>/dev/null || echo 0)
    if [ "$TEMPLATE_OPEN" != "$TEMPLATE_CLOSE" ]; then
        log_fail "$REL_PATH: <template> 标签不匹配 (开:$TEMPLATE_OPEN 闭:$TEMPLATE_CLOSE)"
        ((VUE_ERROR_COUNT++))
    fi

    # 检查 <script> 和 </script> 是否成对
    SCRIPT_OPEN=$(grep -c "<script" "$vue_file" 2>/dev/null || echo 0)
    SCRIPT_CLOSE=$(grep -c "</script>" "$vue_file" 2>/dev/null || echo 0)
    if [ "$SCRIPT_OPEN" != "$SCRIPT_CLOSE" ]; then
        log_fail "$REL_PATH: <script> 标签不匹配 (开:$SCRIPT_OPEN 闭:$SCRIPT_CLOSE)"
        ((VUE_ERROR_COUNT++))
    fi

    # 检查 <style 和 </style> 是否成对
    STYLE_OPEN=$(grep -c "<style" "$vue_file" 2>/dev/null || echo 0)
    STYLE_CLOSE=$(grep -c "</style>" "$vue_file" 2>/dev/null || echo 0)
    if [ "$STYLE_OPEN" != "$STYLE_CLOSE" ]; then
        log_fail "$REL_PATH: <style> 标签不匹配 (开:$STYLE_OPEN 闭:$STYLE_CLOSE)"
        ((VUE_ERROR_COUNT++))
    fi
done

if [ "$VUE_ERROR_COUNT" -eq 0 ]; then
    log_pass "所有 Vue 文件顶层标签闭合正常"
else
    echo -e "  ${RED}→ 发现 $VUE_ERROR_COUNT 个标签问题，这会导致 vite build 失败${NC}"
fi

# ==================== 5. 配置文件检查 ====================
log_section "5. 配置文件检查"

# ecosystem.config.js
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    log_pass "ecosystem.config.js 存在"
    # 检查是否有 env_file（PM2 不支持）
    if grep -q "env_file" "$APP_DIR/ecosystem.config.js"; then
        log_warn "ecosystem.config.js 中有 env_file（PM2 不支持此字段）"
        echo -e "  ${YELLOW}→ 这可能导致 JWT_SECRET 等环境变量无法加载${NC}"
    fi
else
    log_fail "ecosystem.config.js 缺失"
fi

# Nginx 配置
if [ -f "$APP_DIR/nginx/interview-handbook.conf" ]; then
    log_pass "nginx/interview-handbook.conf 存在"
else
    log_fail "nginx/interview-handbook.conf 缺失"
fi

# 检查 Nginx 是否已部署配置
if [ -f "/etc/nginx/sites-available/interview-handbook" ]; then
    log_pass "Nginx 站点配置已部署"
    if [ -L "/etc/nginx/sites-enabled/interview-handbook" ]; then
        log_pass "Nginx 站点已启用 (软链接存在)"
    else
        log_warn "Nginx 站点未启用 (软链接不存在)"
        echo -e "  ${YELLOW}→ 请执行: sudo ln -s /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/${NC}"
    fi
else
    log_warn "Nginx 站点配置未部署到 /etc/nginx/sites-available/"
fi

# ==================== 6. 服务状态检查 ====================
log_section "6. 服务状态检查"

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Node.js
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    log_pass "Node.js: $NODE_VER"
else
    log_fail "Node.js 未安装"
fi

# PM2
if command -v pm2 &> /dev/null; then
    log_pass "PM2 已安装: $(pm2 --version)"
    # 检查 PM2 进程
    if pm2 status 2>/dev/null | grep -q "interview-handbook-api"; then
        PM2_STATE=$(pm2 status 2>/dev/null | grep "interview-handbook-api" | awk '{print $10}')
        if [ "$PM2_STATE" = "online" ]; then
            log_pass "PM2 进程 interview-handbook-api: online"
        else
            log_fail "PM2 进程 interview-handbook-api: $PM2_STATE"
            echo -e "  ${RED}→ 查看日志: pm2 logs interview-handbook-api --lines 30${NC}"
        fi
    else
        log_warn "PM2 进程 interview-handbook-api 未启动"
    fi
else
    log_fail "PM2 未安装"
fi

# Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    log_pass "Nginx: running"
else
    log_fail "Nginx: 未运行"
    echo -e "  ${RED}→ 请执行: sudo systemctl start nginx${NC}"
fi

# ==================== 7. 端口检查 ====================
log_section "7. 端口检查"

# 检查 5000 端口（后端）
if ss -tlnp 2>/dev/null | grep -q ":5000"; then
    log_pass "端口 5000 (后端): 已监听"
else
    log_fail "端口 5000 (后端): 未监听"
    echo -e "  ${RED}→ 后端未启动，检查 PM2 状态${NC}"
fi

# 检查 80 端口（Nginx）
if ss -tlnp 2>/dev/null | grep -q ":80"; then
    log_pass "端口 80 (Nginx): 已监听"
else
    log_fail "端口 80 (Nginx): 未监听"
    echo -e "  ${RED}→ Nginx 未启动或配置有误${NC}"
fi

# ==================== 8. API 连通性检查 ====================
log_section "8. API 连通性检查"

# 健康检查
HEALTH=$(curl -s -m 3 http://127.0.0.1:5000/ 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q "Hello World"; then
    log_pass "后端健康检查: $HEALTH"
else
    log_fail "后端健康检查失败: $HEALTH"
fi

# 通过 Nginx 访问
NGINX_TEST=$(curl -s -o /dev/null -w "%{http_code}" -m 3 http://127.0.0.1/ 2>/dev/null || echo "000")
if [ "$NGINX_TEST" = "200" ]; then
    log_pass "Nginx 本地访问: HTTP 200"
else
    log_fail "Nginx 本地访问: HTTP $NGINX_TEST"
fi

# ==================== 9. 数据文件权限检查 ====================
log_section "9. 数据文件权限检查"

DATA_DIR="$APP_DIR/backend/data"
if [ -d "$DATA_DIR" ]; then
    DATA_OWNER=$(stat -c "%U:%G" "$DATA_DIR" 2>/dev/null || echo "unknown")
    if [ "$DATA_OWNER" = "deploy:deploy" ]; then
        log_pass "data 目录所有者: deploy:deploy"
    else
        log_fail "data 目录所有者: $DATA_OWNER (应为 deploy:deploy)"
        echo -e "  ${RED}→ 请执行: sudo chown -R deploy:deploy $DATA_DIR${NC}"
    fi

    # 检查 JSON 文件是否可写
    for json_file in questions.json users.json records.json marks.json; do
        if [ -f "$DATA_DIR/$json_file" ]; then
            if [ -w "$DATA_DIR/$json_file" ]; then
                log_pass "$json_file 可写"
            else
                log_fail "$json_file 不可写"
            fi
            # 检查文件大小
            FILE_SIZE=$(stat -c "%s" "$DATA_DIR/$json_file" 2>/dev/null || echo 0)
            if [ "$FILE_SIZE" -gt 0 ]; then
                log_pass "$json_file 有数据 (${FILE_SIZE} bytes)"
            else
                log_warn "$json_file 为空"
            fi
        fi
    done
fi

# ==================== 10. 日志目录检查 ====================
log_section "10. 日志目录检查"

LOG_DIR="/var/log/pm2"
if [ -d "$LOG_DIR" ]; then
    LOG_OWNER=$(stat -c "%U:%G" "$LOG_DIR" 2>/dev/null || echo "unknown")
    if [ "$LOG_OWNER" = "deploy:deploy" ]; then
        log_pass "日志目录所有者: deploy:deploy"
    else
        log_fail "日志目录所有者: $LOG_OWNER (应为 deploy:deploy)"
        echo -e "  ${RED}→ 请执行: sudo chown -R deploy:deploy $LOG_DIR${NC}"
    fi
else
    log_warn "日志目录不存在: $LOG_DIR"
fi

# ==================== 诊断报告 ====================
log_section "诊断报告"

echo ""
echo -e "${GREEN}通过: $PASS_COUNT${NC}  ${RED}失败: $FAIL_COUNT${NC}  ${YELLOW}警告: $WARN_COUNT${NC}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ] && [ "$WARN_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！服务器状态健康。${NC}"
elif [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}! 有 $WARN_COUNT 个警告，但没有严重问题。${NC}"
else
    echo -e "${RED}✗ 发现 $FAIL_COUNT 个问题，需要修复。${NC}"
    echo ""
    echo -e "${YELLOW}修复建议优先级:${NC}"
    echo -e "  1. 先修复文件缺失问题（git pull 或手动创建）"
    echo -e "  2. 再修复环境变量问题（.env.production.active）"
    echo -e "  3. 然后修复依赖问题（npm ci）"
    echo -e "  4. 最后修复服务问题（pm2 restart / nginx restart）"
    echo ""
    echo -e "${YELLOW}快速修复命令:${NC}"
    echo -e "  git pull origin reborn              # 拉取最新代码"
    echo -e "  cd backend && npm ci --production    # 安装后端依赖"
    echo -e "  cd frontend && npm ci && npm run build  # 安装前端依赖并构建"
    echo -e "  pm2 restart interview-handbook-api   # 重启后端"
    echo -e "  sudo systemctl restart nginx         # 重启 Nginx"
fi

echo ""
echo -e "${BLUE}诊断完成。${NC}"
