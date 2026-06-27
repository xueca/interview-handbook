#!/bin/bash
# 文件功能: interview-handbook 步骤 4.1-4.3 专用搭建脚本 | 数据流: 检查 → 构建前端 → 配置Nginx → 验证
# 前置条件: 步骤 3.8 已完成（PM2 已启动且后端验证通过）
# 使用方式: 以 deploy 用户执行: bash server-setup-4.1-4.3.sh
# 执行后进度: 步骤 4.3 完成，下一步是 4.4（浏览器验证）

set -e

APP_DIR="/var/www/interview-handbook"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "  ${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "  ${RED}[ERROR]${NC} $1"; }
log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}
log_fail_exit() {
    echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  执行失败: $1${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}错误详情: $2${NC}"
    echo -e "${RED}修复建议: $3${NC}"
    echo ""
    exit 1
}

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  interview-handbook 4.1-4.3 搭建脚本 v1.0 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

# ==================== 检查当前用户 ====================
if [ "$(whoami)" != "deploy" ]; then
    log_fail_exit "用户检查" "当前用户不是 deploy" "请执行: su - deploy"
fi

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ==================== 前置条件检查 ====================
log_step "前置条件检查"

# 检查项目目录
if [ ! -d "$APP_DIR" ]; then
    log_fail_exit "目录检查" "$APP_DIR 不存在" "请先执行步骤 3.1 拉取代码"
fi
log_info "项目目录存在 ✓"

# 检查后端是否在运行（4.1 的前置条件是后端已启动）
if ! curl -s -m 3 http://127.0.0.1:5000/ | grep -q "Hello World" 2>/dev/null; then
    log_fail_exit "后端检查" "后端未运行或无法访问" "请先完成步骤 3.6-3.7，确保 PM2 已启动"
fi
log_info "后端运行正常 ✓"

# 检查前端目录
if [ ! -d "$APP_DIR/frontend" ]; then
    log_fail_exit "前端目录" "frontend/ 不存在" "请执行: git pull origin reborn"
fi
log_info "前端目录存在 ✓"

# 检查 package.json
if [ ! -f "$APP_DIR/frontend/package.json" ]; then
    log_fail_exit "package.json" "frontend/package.json 不存在" "请执行: git pull origin reborn"
fi
log_info "package.json 存在 ✓"

# 检查 Nginx 配置源文件
if [ ! -f "$APP_DIR/nginx/interview-handbook.conf" ]; then
    log_fail_exit "Nginx配置" "nginx/interview-handbook.conf 不存在" "请执行: git pull origin reborn"
fi
log_info "Nginx 配置源文件存在 ✓"

# 检查 Nginx 是否安装
if ! command -v nginx &> /dev/null; then
    log_fail_exit "Nginx安装" "nginx 命令不存在" "请执行: sudo apt install -y nginx"
fi
log_info "Nginx 已安装: $(nginx -v 2>&1) ✓"

echo ""
log_info "前置条件全部通过 ✓"

# ==================== 步骤 4.1: 构建前端 ====================
log_step "[4.1] 构建前端"

cd "$APP_DIR/frontend"

# --- 4.1a: 清理旧的构建产物 ---
log_info "清理旧的构建产物..."
rm -rf dist
log_info "清理完成 ✓"

# --- 4.1b: 安装依赖 ---
log_info "安装前端依赖 (npm ci)..."

# 检查 package-lock.json 是否存在
if [ ! -f "package-lock.json" ]; then
    log_warn "package-lock.json 不存在，使用 npm install 代替"
    NPM_INSTALL_CMD="npm install"
else
    NPM_INSTALL_CMD="npm ci"
fi

# 执行安装并捕获输出
NPM_OUTPUT=$($NPM_INSTALL_CMD 2>&1) || {
    log_fail_exit "npm ci" "$NPM_OUTPUT" "尝试: rm -rf node_modules && npm install"
}
log_info "前端依赖安装完成 ✓"

# 验证关键依赖是否安装成功
log_info "验证关键依赖..."
DEPS_MISSING=0
for pkg in vue vue-router pinia element-plus echarts axios vite @vitejs/plugin-vue; do
    if [ ! -d "node_modules/$pkg" ]; then
        log_error "依赖缺失: $pkg"
        ((DEPS_MISSING++))
    fi
done

if [ "$DEPS_MISSING" -gt 0 ]; then
    log_fail_exit "依赖验证" "有 $DEPS_MISSING 个关键依赖缺失" "请执行: rm -rf node_modules package-lock.json && npm install"
fi
log_info "所有关键依赖已安装 ✓"

# --- 4.1c: 检查 Vue 文件完整性 ---
log_info "检查 Vue 文件标签闭合..."

VUE_ERROR=0
for vue_file in src/views/*.vue src/components/*.vue src/App.vue; do
    [ -f "$vue_file" ] || continue

    # 检查 <template> 闭合
    T_OPEN=$(grep -c "<template>" "$vue_file" 2>/dev/null || echo 0)
    T_CLOSE=$(grep -c "</template>" "$vue_file" 2>/dev/null || echo 0)
    if [ "$T_OPEN" != "$T_CLOSE" ]; then
        log_error "$vue_file: <template> 不匹配 (开:$T_OPEN 闭:$T_CLOSE)"
        ((VUE_ERROR++))
    fi

    # 检查 <script> 闭合
    S_OPEN=$(grep -c "<script" "$vue_file" 2>/dev/null || echo 0)
    S_CLOSE=$(grep -c "</script>" "$vue_file" 2>/dev/null || echo 0)
    if [ "$S_OPEN" != "$S_CLOSE" ]; then
        log_error "$vue_file: <script> 不匹配 (开:$S_OPEN 闭:$S_CLOSE)"
        ((VUE_ERROR++))
    fi
done

if [ "$VUE_ERROR" -gt 0 ]; then
    log_fail_exit "Vue文件检查" "发现 $VUE_ERROR 个标签闭合问题" "请检查报错的 Vue 文件，修复标签闭合后重试"
fi
log_info "Vue 文件标签闭合检查通过 ✓"

# --- 4.1d: 执行构建 ---
log_info "执行构建 (npm run build)..."

BUILD_OUTPUT=$(npm run build 2>&1) || {
    echo -e "\n${RED}构建失败！完整错误输出:${NC}"
    echo "$BUILD_OUTPUT"
    echo ""

    # 分析常见错误并给出建议
    if echo "$BUILD_OUTPUT" | grep -q "missing end tag"; then
        log_error "错误类型: Vue 标签未闭合"
        echo -e "${YELLOW}诊断: 某个 .vue 文件的 HTML 标签没有正确闭合${NC}"
        echo -e "${YELLOW}排查: 查看上面的错误信息，找到具体文件和行号${NC}"
        echo -e "${YELLOW}修复: 检查该文件对应行号的标签，确保所有标签都正确闭合${NC}"
    elif echo "$BUILD_OUTPUT" | grep -q "Cannot find module\|Module not found"; then
        log_error "错误类型: 模块未找到"
        echo -e "${YELLOW}诊断: 缺少 npm 依赖${NC}"
        echo -e "${YELLOW}排查: 查看错误信息中缺少的模块名${NC}"
        echo -e "${YELLOW}修复: npm install <缺失的模块名>${NC}"
    elif echo "$BUILD_OUTPUT" | grep -q "SyntaxError\|Unexpected token"; then
        log_error "错误类型: JavaScript 语法错误"
        echo -e "${YELLOW}诊断: 某个 .js 或 .vue 文件有语法错误${NC}"
        echo -e "${YELLOW}排查: 查看错误信息中的文件路径和行号${NC}"
        echo -e "${YELLOW}修复: 检查该文件的对应行，修复语法错误${NC}"
    elif echo "$BUILD_OUTPUT" | grep -q "ENOENT\|no such file"; then
        log_error "错误类型: 文件不存在"
        echo -e "${YELLOW}诊断: 构建过程中找不到某个文件${NC}"
        echo -e "${YELLOW}排查: 查看错误信息中的文件路径${NC}"
        echo -e "${YELLOW}修复: git pull origin reborn 拉取最新代码${NC}"
    elif echo "$BUILD_OUTPUT" | grep -q "EACCES\|permission denied"; then
        log_error "错误类型: 权限不足"
        echo -e "${YELLOW}诊断: 文件或目录权限不对${NC}"
        echo -e "${YELLOW}修复: sudo chown -R deploy:deploy $APP_DIR${NC}"
    else
        log_error "错误类型: 未知错误"
        echo -e "${YELLOW}请将上面的完整错误信息发给我分析${NC}"
    fi

    exit 1
}

log_info "前端构建成功 ✓"

# --- 4.1e: 验证构建产物 ---
log_info "验证构建产物..."

if [ ! -f "dist/index.html" ]; then
    log_fail_exit "构建产物" "dist/index.html 不存在" "构建可能未完成，检查上面的输出"
fi
log_info "dist/index.html 存在 ✓"

DIST_JS=$(find dist -name "*.js" 2>/dev/null | wc -l)
DIST_CSS=$(find dist -name "*.css" 2>/dev/null | wc -l)

if [ "$DIST_JS" -eq 0 ]; then
    log_fail_exit "构建产物" "dist 中没有 JS 文件" "构建可能失败，检查 vite 配置"
fi
log_info "dist 中有 $DIST_JS 个 JS 文件, $DIST_CSS 个 CSS 文件 ✓"

# 显示构建产物
echo ""
log_info "构建产物列表:"
ls -la dist/
echo ""

# ==================== 步骤 4.2: 配置 Nginx ====================
log_step "[4.2] 配置 Nginx"

# --- 4.2a: 获取公网 IP ---
log_info "获取服务器公网 IP..."
PUBLIC_IP=$(curl -s -m 5 ifconfig.me 2>/dev/null || echo "")

if [ -z "$PUBLIC_IP" ]; then
    log_warn "无法自动获取公网 IP"
    read -p "  请输入服务器公网 IP: " PUBLIC_IP
    if [ -z "$PUBLIC_IP" ]; then
        log_fail_exit "公网IP" "未输入公网 IP" "请在阿里云控制台查看服务器公网 IP"
    fi
fi
log_info "公网 IP: $PUBLIC_IP ✓"

# --- 4.2b: 复制 Nginx 配置 ---
log_info "复制 Nginx 配置文件..."

# 备份旧配置（如果存在）
if [ -f "/etc/nginx/sites-available/interview-handbook" ]; then
    sudo cp /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-available/interview-handbook.bak
    log_info "已备份旧配置到 interview-handbook.bak"
fi

# 复制新配置
sudo cp "$APP_DIR/nginx/interview-handbook.conf" /etc/nginx/sites-available/interview-handbook
log_info "配置文件已复制 ✓"

# --- 4.2c: 修改 server_name ---
log_info "修改 server_name 为公网 IP..."
sudo sed -i "s/your-domain.com www.your-domain.com/$PUBLIC_IP/" /etc/nginx/sites-available/interview-handbook

# 验证修改结果
SERVER_NAME=$(sudo grep "server_name" /etc/nginx/sites-available/interview-handbook | head -1)
if echo "$SERVER_NAME" | grep -q "$PUBLIC_IP"; then
    log_info "server_name 已修改: $SERVER_NAME ✓"
else
    log_fail_exit "Nginx配置" "server_name 修改失败: $SERVER_NAME" "请手动编辑: sudo vim /etc/nginx/sites-available/interview-handbook"
fi

# --- 4.2d: 验证关键配置项 ---
log_info "验证 Nginx 关键配置项..."

# 检查 proxy_buffering off（SSE 必须）
if sudo grep -q "proxy_buffering off;" /etc/nginx/sites-available/interview-handbook; then
    log_info "proxy_buffering off; 存在 ✓"
else
    log_fail_exit "Nginx配置" "缺少 proxy_buffering off;" "SSE 流式输出需要此配置，请检查 nginx/interview-handbook.conf"
fi

# 检查 root 路径
if sudo grep -q "root /var/www/interview-handbook/frontend/dist;" /etc/nginx/sites-available/interview-handbook; then
    log_info "root 路径正确 ✓"
else
    log_fail_exit "Nginx配置" "root 路径不正确" "应指向 /var/www/interview-handbook/frontend/dist"
fi

# 检查 proxy_pass
if sudo grep -q "proxy_pass http://backend_api;" /etc/nginx/sites-available/interview-handbook; then
    log_info "proxy_pass 配置正确 ✓"
else
    log_fail_exit "Nginx配置" "proxy_pass 配置不正确" "应指向 http://backend_api"
fi

# 检查 try_files（SPA history 模式）
if sudo grep -q "try_files \$uri \$uri/ /index.html;" /etc/nginx/sites-available/interview-handbook; then
    log_info "try_files (SPA fallback) 配置正确 ✓"
else
    log_warn "try_files 配置可能不正确，SPA 路由可能无法正常工作"
fi

# ==================== 步骤 4.3: 启用站点 + 重启 Nginx ====================
log_step "[4.3] 启用站点 + 重启 Nginx"

# --- 4.3a: 创建软链接 ---
log_info "创建站点软链接..."
sudo ln -sf /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/
log_info "软链接已创建 ✓"

# --- 4.3b: 删除默认站点 ---
log_info "删除默认站点（避免冲突）..."
sudo rm -f /etc/nginx/sites-enabled/default
log_info "默认站点已删除 ✓"

# --- 4.3c: 检查 Nginx 配置语法 ---
log_info "检查 Nginx 配置语法..."

NGINX_TEST_OUTPUT=$(sudo nginx -t 2>&1) || {
    log_fail_exit "Nginx语法" "$NGINX_TEST_OUTPUT" "请根据上面的错误信息修复 Nginx 配置"
}

if echo "$NGINX_TEST_OUTPUT" | grep -q "syntax is ok" && echo "$NGINX_TEST_OUTPUT" | grep -q "test is successful"; then
    log_info "Nginx 配置语法正确 ✓"
else
    log_fail_exit "Nginx语法" "$NGINX_TEST_OUTPUT" "Nginx 配置语法有误"
fi

# --- 4.3d: 重启 Nginx ---
log_info "重启 Nginx..."

sudo systemctl restart nginx 2>&1 || {
    log_fail_exit "Nginx重启" "systemctl restart nginx 失败" "请执行: sudo nginx -t 检查配置，然后: sudo systemctl status nginx 查看错误"
}

# 验证 Nginx 状态
sleep 1
if systemctl is-active --quiet nginx; then
    log_info "Nginx 已启动并运行 ✓"
else
    log_fail_exit "Nginx状态" "Nginx 未运行" "请执行: sudo systemctl status nginx 查看错误日志"
fi

# --- 4.3e: 验证端口监听 ---
log_info "验证端口监听..."

if ss -tlnp 2>/dev/null | grep -q ":80 "; then
    log_info "端口 80 已监听 ✓"
else
    log_fail_exit "端口检查" "端口 80 未监听" "Nginx 可能未正确启动，检查: sudo systemctl status nginx"
fi

# ==================== 最终验证 ====================
log_step "最终验证"

# --- 验证 1: 本地访问前端 ---
log_info "验证 1/4: 本地访问前端页面..."
LOCAL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -m 5 http://127.0.0.1/ 2>/dev/null || echo "000")

if [ "$LOCAL_HTTP" = "200" ]; then
    log_info "本地访问前端: HTTP 200 ✓"
else
    log_error "本地访问前端: HTTP $LOCAL_HTTP"
    echo -e "  ${YELLOW}→ 检查 Nginx 配置中 root 路径是否指向 dist 目录${NC}"
    echo -e "  ${YELLOW}→ 检查 dist/index.html 是否存在${NC}"
fi

# --- 验证 2: 本地访问 API ---
log_info "验证 2/4: 本地通过 Nginx 访问 API..."
LOCAL_API=$(curl -s -o /dev/null -w "%{http_code}" -m 5 http://127.0.0.1/api/questions 2>/dev/null || echo "000")

if [ "$LOCAL_API" = "200" ] || [ "$LOCAL_API" = "401" ] || [ "$LOCAL_API" = "403" ]; then
    log_info "本地访问 API: HTTP $LOCAL_API ✓ (401/403 是正常的，因为未携带 token)"
else
    log_error "本地访问 API: HTTP $LOCAL_API"
    echo -e "  ${YELLOW}→ 检查后端是否运行: pm2 status${NC}"
    echo -e "  ${YELLOW}→ 检查 Nginx proxy_pass 配置${NC}"
fi

# --- 验证 3: 公网访问前端 ---
log_info "验证 3/4: 公网访问前端页面..."
PUBLIC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://$PUBLIC_IP/" 2>/dev/null || echo "000")

if [ "$PUBLIC_HTTP" = "200" ]; then
    log_info "公网访问前端: HTTP 200 ✓"
else
    log_warn "公网访问前端: HTTP $PUBLIC_HTTP"
    echo -e "  ${YELLOW}→ 如果返回 000: 检查阿里云安全组是否开放 80 端口${NC}"
    echo -e "  ${YELLOW}→ 如果返回 502: 后端未运行，检查 pm2 status${NC}"
    echo -e "  ${YELLOW}→ 如果返回 404: Nginx 配置有误，检查 root 路径${NC}"
fi

# --- 验证 4: 检查前端页面内容 ---
log_info "验证 4/4: 检查前端页面内容..."
PAGE_CONTENT=$(curl -s -m 5 http://127.0.0.1/ 2>/dev/null || echo "")

if echo "$PAGE_CONTENT" | grep -q "<div id=\"app\">"; then
    log_info "页面包含 Vue 挂载点 (#app) ✓"
else
    log_warn "页面内容可能不正确，未找到 #app 挂载点"
fi

if echo "$PAGE_CONTENT" | grep -q "script" && echo "$PAGE_CONTENT" | grep -q "module"; then
    log_info "页面包含 JS 模块引用 ✓"
else
    log_warn "页面可能缺少 JS 引用，检查 vite 构建输出"
fi

# ==================== 完成 ====================
log_step "搭建完成！"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  步骤 4.1-4.3 全部完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
log_info "公网访问地址: http://$PUBLIC_IP"
log_info "后端 API 地址: http://127.0.0.1:5000"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  脚本执行后进度说明${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓ 已完成步骤:${NC}"
echo "  4.1  构建前端 (npm ci + npm run build)"
echo "  4.2  配置 Nginx (复制配置 + 修改 server_name)"
echo "  4.3  启用站点 + 重启 Nginx"
echo ""
echo -e "${YELLOW}⏳ 下一步（需手动完成）:${NC}"
echo "  4.4  浏览器验证 — 在浏览器打开 http://$PUBLIC_IP"
echo "  4.5  全流程测试 — 注册/登录/答题/AI/SSE"
echo ""
echo -e "${YELLOW}如果浏览器打不开或异常:${NC}"
echo "  1. 运行诊断脚本: bash server-diagnose.sh"
echo "  2. 查看后端日志: pm2 logs interview-handbook-api --lines 30"
echo "  3. 查看 Nginx 日志: sudo tail -20 /var/log/nginx/error.log"
echo ""
echo -e "${GREEN}当前总体进度: 步骤 4.3 完成${NC}"
echo ""
