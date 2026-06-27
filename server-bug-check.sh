#!/bin/bash
# 文件功能: interview-handbook 网页 Bug 检查脚本 | 数据流: 构建验证 → API测试 → SSE测试 → 配置检查 → 根因报告
# 使用方式: 以 deploy 用户执行: bash server-bug-check.sh [公网IP]
# 作用: 端到端检查网页可能出现的 Bug，定位到问题真正根源
# 与 server-diagnose.sh 的区别: 本脚本做"功能级"测试（模拟用户操作），不做"文件级"检查

# 不用 set -e，检查脚本要跑完所有项目再报告

APP_DIR="/var/www/interview-handbook"
PUBLIC_IP="${1:-127.0.0.1}"  # 第一个参数是公网IP，默认本地测试

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 计数器
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
BUG_LIST=()  # 收集所有发现的 Bug 及根因

log_pass() { echo -e "  ${GREEN}[✓]${NC} $1"; ((PASS_COUNT++)); }
log_fail() { echo -e "  ${RED}[✗]${NC} $1"; ((FAIL_COUNT++)); }
log_warn() { echo -e "  ${YELLOW}[!]${NC} $1"; ((WARN_COUNT++)); }
log_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}
# 记录 Bug 根因
log_bug() {
    local title="$1"
    local root_cause="$2"
    local fix="$3"
    BUG_LIST+=("【Bug】$title\n  根因: $root_cause\n  修复: $fix")
    echo -e "  ${RED}[BUG]${NC} $title"
    echo -e "       根因: ${CYAN}${root_cause}${NC}"
    echo -e "       修复: ${YELLOW}${fix}${NC}"
    ((FAIL_COUNT++))
}

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  interview-handbook 网页 Bug 检查工具 v1.0       ║${NC}"
echo -e "${BLUE}║  目标: 定位到问题真正根源，不只是报错             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo -e "测试目标: http://$PUBLIC_IP"

# ==================== 1. 前端构建完整性检查 ====================
log_section "1. 前端构建完整性（最常见 Bug 根源）"

# Bug 根因 #1: vite build 失败 → dist 不更新 → 浏览器加载旧代码
DIST_DIR="$APP_DIR/frontend/dist"
if [ ! -d "$DIST_DIR" ]; then
    log_bug "前端 dist 目录不存在" \
        "npm run build 从未执行或失败，浏览器无法加载任何页面" \
        "cd frontend && npm ci && npm run build"
else
    log_pass "dist 目录存在"

    # 检查 index.html 是否包含正确的 script 引用
    INDEX_HTML="$DIST_DIR/index.html"
    if [ -f "$INDEX_HTML" ]; then
        log_pass "dist/index.html 存在"

        # 检查 index.html 是否引用了 JS 文件（Vite 构建后会注入）
        if grep -q 'type="module"' "$INDEX_HTML" 2>/dev/null; then
            log_pass "index.html 包含 module script 引用"
        else
            log_bug "index.html 未引用 JS 模块" \
                "vite build 可能未完成或 index.html 被意外覆盖" \
                "重新构建: cd frontend && npm run build"
        fi

        # 检查 index.html 是否是 Vite 默认模板（说明构建没覆盖）
        if grep -q 'Vite + Vue' "$INDEX_HTML" 2>/dev/null; then
            log_bug "index.html 是 Vite 默认模板" \
                "vite build 失败后 dist/ 仍是初始状态，浏览器显示默认页而非面试宝典" \
                "检查构建错误: cd frontend && npm run build 2>&1 | tail -20"
        else
            log_pass "index.html 不是 Vite 默认模板"
        fi
    else
        log_bug "dist/index.html 不存在" \
            "构建产物缺失，Nginx 无法返回任何页面" \
            "cd frontend && npm run build"
    fi

    # 检查 JS 文件数量和大小
    JS_COUNT=$(find "$DIST_DIR" -name "*.js" 2>/dev/null | wc -l)
    if [ "$JS_COUNT" -gt 0 ]; then
        log_pass "dist 中有 $JS_COUNT 个 JS 文件"
        # 检查 JS 文件是否有内容（不是空文件）
        SMALLEST_JS=$(find "$DIST_DIR" -name "*.js" -exec stat -c "%s" {} \; 2>/dev/null | sort -n | head -1)
        if [ "$SMALLEST_JS" -gt 100 ]; then
            log_pass "最小 JS 文件大小: ${SMALLEST_JS} bytes（有内容）"
        else
            log_bug "JS 文件过小 (${SMALLEST_JS} bytes)" \
                "构建可能被中断或源码有语法错误导致打包不完整" \
                "查看构建日志: cd frontend && npm run build 2>&1"
        fi
    else
        log_bug "dist 中没有 JS 文件" \
            "vite build 失败，可能 Vue 文件有语法错误" \
            "cd frontend && npm run build 看报错"
    fi
fi

# Bug 根因 #2: Vue 模板标签不匹配 → vite build 失败
log_section "1.1 Vue 文件标签闭合检查（构建失败的常见根因）"
VUE_FILES=$(find "$APP_DIR/frontend/src" -name "*.vue" 2>/dev/null)
VUE_TAG_ERROR=0
for vue_file in $VUE_FILES; do
    REL_PATH=${vue_file#$APP_DIR/}
    # 使用 grep -oE 匹配所有 <template> 和 <template v-if="..."> 和 <template #header> 等变体
    # grep -c 只按行计数，单行多个标签会漏；grep -o 逐个输出再 wc -l 才准确
    T_OPEN=$(grep -oE "<template[ >]" "$vue_file" 2>/dev/null | wc -l)
    T_CLOSE=$(grep -oE "</template>" "$vue_file" 2>/dev/null | wc -l)
    if [ "$T_OPEN" -ne "$T_CLOSE" ]; then
        log_bug "$REL_PATH: <template> 标签不匹配 (开:$T_OPEN 闭:$T_CLOSE)" \
            "Vue SFC 的 template 标签未成对闭合，vite 编译会报 'Element is missing end tag'" \
            "检查 $REL_PATH 的 template 结构，确保每个 <template>/<template v-if>/<template #header> 都有对应的 </template>"
        ((VUE_TAG_ERROR++))
    fi
    S_OPEN=$(grep -c "<script" "$vue_file" 2>/dev/null || echo 0)
    S_CLOSE=$(grep -c "</script>" "$vue_file" 2>/dev/null || echo 0)
    if [ "$S_OPEN" != "$S_CLOSE" ]; then
        log_bug "$REL_PATH: <script> 标签不匹配" \
            "script 块未闭合，vite 无法解析组件逻辑" \
            "补上 </script> 结束标签"
        ((VUE_TAG_ERROR++))
    fi
done
if [ "$VUE_TAG_ERROR" -eq 0 ]; then
    log_pass "所有 Vue 文件标签闭合正常"
fi

# ==================== 2. 前后端代码一致性检查 ====================
log_section "2. 前后端代码一致性（AI出题400的根因）"

# Bug 根因 #3: 前端发送 prompt 字符串而非 params 对象 → express.json() 拒绝
USEAICHAT="$APP_DIR/frontend/src/composables/useAiChat.js"
if [ -f "$USEAICHAT" ]; then
    # 检查 generateQuestions 是否发送 params 对象（而非 prompt 字符串）
    if grep -q "callSSE('generate', params" "$USEAICHAT" 2>/dev/null; then
        log_pass "useAiChat.js: generateQuestions 发送 params 对象 ✅"
    elif grep -q "callSSE('generate', prompt" "$USEAICHAT" 2>/dev/null; then
        log_bug "useAiChat.js 发送 prompt 字符串而非 params 对象" \
            "JSON.stringify('请生成...') 产生裸字符串，express.json() strict 模式只接受对象/数组，返回 400" \
            "把 callSSE('generate', prompt, state) 改为 callSSE('generate', params, state)"
    else
        log_warn "useAiChat.js: 未找到 callSSE('generate' 调用，可能代码结构变了"
    fi
else
    log_fail "useAiChat.js 不存在"
fi

# 检查 ai.js 是否直接传 params（不包装为 {topic}）
AI_JS="$APP_DIR/frontend/src/api/ai.js"
if [ -f "$AI_JS" ]; then
    if grep -q "generateStream(params" "$AI_JS" 2>/dev/null; then
        log_pass "ai.js: generateStream 直接传 params ✅"
    elif grep -q "generateStream(topic" "$AI_JS" 2>/dev/null; then
        log_bug "ai.js: generateStream 接收 topic 而非 params" \
            "前端把 prompt 包装为 {topic}，但后端期望 {category, difficulty}，字段不匹配" \
            "改为 generateStream(params, ...) 并 createSSE(url, params, ...)"
    fi
fi

# 检查后端 aiController 是否从 req.body 读取 category/difficulty
AI_CONTROLLER="$APP_DIR/backend/controllers/aiController.js"
if [ -f "$AI_CONTROLLER" ]; then
    if grep -q "category.*difficulty.*req.body\|req\.body.*category.*difficulty" "$AI_CONTROLLER" 2>/dev/null; then
        log_pass "aiController.js: 从 req.body 读取 category/difficulty ✅"
    elif grep -q "req\.body.*topic\|topic.*req\.body" "$AI_CONTROLLER" 2>/dev/null; then
        log_bug "aiController.js: 后端读 topic 而非 category/difficulty" \
            "前后端字段名不匹配：前端发 {category,difficulty}，后端找 {topic}" \
            "改为 const { category, difficulty } = req.body"
    fi
fi

# ==================== 3. Nginx 配置检查 ====================
log_section "3. Nginx 配置检查（SSE和SPA的常见根因）"

NGINX_CONF="/etc/nginx/sites-available/interview-handbook"
if [ ! -f "$NGINX_CONF" ]; then
    NGINX_CONF="$APP_DIR/nginx/interview-handbook.conf"
fi

if [ -f "$NGINX_CONF" ]; then
    log_pass "Nginx 配置文件存在: $NGINX_CONF"

    # Bug 根因 #4: proxy_request_buffering off → POST body 不完整 → 400
    if grep -q "proxy_request_buffering off" "$NGINX_CONF" 2>/dev/null; then
        log_bug "Nginx 配置中有 proxy_request_buffering off" \
            "该指令导致 Nginx 不缓冲 POST body 就转发，body 可能未完整到达后端，express.json() 解析失败返回 400" \
            "删除 proxy_request_buffering off; 这一行，让 Nginx 用默认的 request buffering on"
    else
        log_pass "无 proxy_request_buffering off（POST body 会完整缓冲）"
    fi

    # Bug 根因 #5: proxy_buffering on → SSE 不流式 → AI 回复一次性返回
    # 注意：proxy_buffering off 是 SSE 必须的，但如果没配会出问题
    if grep -q "proxy_buffering off" "$NGINX_CONF" 2>/dev/null; then
        log_pass "有 proxy_buffering off（SSE 流式输出正常）"
    else
        log_bug "缺少 proxy_buffering off" \
            "Nginx 默认开启 proxy_buffering，会缓冲整个 SSE 响应再返回，导致 AI 回复等很久一次性出现而非逐字显示" \
            "在 location /api/ 中添加: proxy_buffering off;"
    fi

    # Bug 根因 #6: 缺少 try_files → SPA 路由刷新 404
    if grep -q "try_files.*index.html" "$NGINX_CONF" 2>/dev/null; then
        log_pass "有 try_files ... index.html（SPA 路由刷新不会 404）"
    else
        log_bug "缺少 try_files ... /index.html" \
            "Vue Router history 模式下，刷新 /question-bank 时 Nginx 找不到对应文件返回 404" \
            "在 location / 中添加: try_files \$uri \$uri/ /index.html;"
    fi

    # Bug 根因 #7: index.html 没有禁止缓存 → 浏览器加载旧版 JS
    if grep -q "index.html" "$NGINX_CONF" 2>/dev/null && grep -q "no-cache\|no-store" "$NGINX_CONF" 2>/dev/null; then
        log_pass "index.html 有禁止缓存配置"
    else
        log_bug "index.html 缺少禁止缓存配置" \
            "浏览器缓存了旧版 index.html，导致用户看到的始终是旧版 JS，代码更新后不生效" \
            "添加 location = /index.html { add_header Cache-Control 'no-cache, no-store, must-revalidate'; }"
    fi

    # 检查 server_name 是否为 IP 或 _
    SERVER_NAME=$(grep "server_name" "$NGINX_CONF" 2>/dev/null | head -1 | sed 's/.*server_name\s*//;s/;.*//')
    if [ "$SERVER_NAME" = "_" ] || echo "$SERVER_NAME" | grep -qE '^[0-9]+\.'; then
        log_pass "server_name: $SERVER_NAME（适配无域名场景）"
    elif echo "$SERVER_NAME" | grep -q "your-domain"; then
        log_bug "server_name 仍是占位符 your-domain.com" \
            "Nginx 不匹配实际访问的 IP，可能导致请求路由到默认站点" \
            "改为 server_name _; 或 server_name <你的公网IP>;"
    fi
else
    log_fail "Nginx 配置文件不存在"
fi

# ==================== 4. 后端环境变量检查 ====================
log_section "4. 后端环境变量（PM2崩溃的根因）"

ENV_FILE="$APP_DIR/backend/.env.production.active"
if [ -f "$ENV_FILE" ]; then
    log_pass ".env.production.active 存在"

    # Bug 根因 #8: JWT_SECRET 未设置 → auth.js 调用 process.exit(1) → PM2 崩溃循环
    JWT_VAL=$(grep "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d= -f2)
    if [ -n "$JWT_VAL" ] && [ ${#JWT_VAL} -ge 32 ]; then
        log_pass "JWT_SECRET 已设置 (长度 ${#JWT_VAL})"
    elif [ -n "$JWT_VAL" ]; then
        log_bug "JWT_SECRET 过短 (${#JWT_VAL} 字符)" \
            "短密钥容易被破解，伪造 JWT token 绕过认证" \
            "openssl rand -hex 32 生成 64 字符密钥"
    else
        log_bug "JWT_SECRET 未设置" \
            "auth.js 检测到 JWT_SECRET 为空时调用 process.exit(1)，PM2 不断重启崩溃" \
            "在 .env.production.active 中添加 JWT_SECRET=$(openssl rand -hex 32)"
    fi

    # Bug 根因 #9: DEEPSEEK_API_KEY 未设置 → AI 出题返回 500
    KEY_VAL=$(grep "^DEEPSEEK_API_KEY=" "$ENV_FILE" 2>/dev/null | cut -d= -f2)
    if [ -n "$KEY_VAL" ]; then
        log_pass "DEEPSEEK_API_KEY 已设置"
    else
        log_bug "DEEPSEEK_API_KEY 未设置" \
            "deepseekService.js 调用 API 时无 Key，返回 401，前端显示 'AI服务暂不可用'" \
            "在 .env.production.active 中添加 DEEPSEEK_API_KEY=sk-xxx"
    fi
else
    log_bug ".env.production.active 不存在" \
        "app.js 加载不到环境变量文件，JWT_SECRET 和 DEEPSEEK_API_KEY 均为空" \
        "cp .env.production.example .env.production.active 然后填入真实密钥"
fi

# Bug 根因 #10: app.js 加载错误的 env 文件
APP_JS="$APP_DIR/backend/app.js"
if [ -f "$APP_JS" ]; then
    if grep -q "env.production.active\|NODE_ENV.*production.*env" "$APP_JS" 2>/dev/null; then
        log_pass "app.js 正确加载 .env.production.active"
    else
        log_bug "app.js 可能加载错误的 env 文件" \
            "require('dotenv').config() 默认加载 .env 而非 .env.production.active，PM2 生产环境读不到密钥" \
            "改为 require('dotenv').config({ path: __dirname + '/.env.production.active' })"
    fi
fi

# ==================== 5. API 端到端测试 ====================
log_section "5. API 端到端测试（模拟用户操作）"

# 测试健康检查
HEALTH_RESP=$(curl -s -m 5 http://127.0.0.1:5000/ 2>/dev/null || echo "CURL_FAIL")
if echo "$HEALTH_RESP" | grep -q "Hello World"; then
    log_pass "后端健康检查: $HEALTH_RESP"
else
    log_bug "后端健康检查失败: $HEALTH_RESP" \
        "后端未启动或 app.js 报错，PM2 可能处于 stopped/errored 状态" \
        "pm2 status 查看 → pm2 logs interview-handbook-api --lines 30 看报错"
fi

# 测试注册 API
REGISTER_RESP=$(curl -s -m 5 -X POST http://127.0.0.1:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"bugcheck_test","password":"Test123456"}' 2>/dev/null || echo "CURL_FAIL")
if echo "$REGISTER_RESP" | grep -q "token\|成功\|已存在"; then
    log_pass "注册 API 正常: $(echo $REGISTER_RESP | head -c 80)"
else
    log_bug "注册 API 异常: $(echo $REGISTER_RESP | head -c 80)" \
        "可能原因: 数据文件不可写 / users.json 权限问题 / bcryptjs 未安装" \
        "检查: ls -la backend/data/users.json && pm2 logs --lines 20"
fi

# 测试登录 API 获取 token
LOGIN_RESP=$(curl -s -m 5 -X POST http://127.0.0.1:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"bugcheck_test","password":"Test123456"}' 2>/dev/null || echo "CURL_FAIL")
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    log_pass "登录 API 正常，获取到 token"
else
    log_bug "登录 API 未返回 token: $(echo $LOGIN_RESP | head -c 80)" \
        "JWT_SECRET 未设置时 jsonwebtoken.sign() 抛异常，或用户不存在" \
        "检查 .env.production.active 的 JWT_SECRET + 确认用户已注册"
fi

# 测试题库 API
if [ -n "$TOKEN" ]; then
    QUESTIONS_RESP=$(curl -s -m 5 http://127.0.0.1:5000/api/questions \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "CURL_FAIL")
    if echo "$QUESTIONS_RESP" | grep -q "data\|questions\|total"; then
        log_pass "题库 API 正常"
    else
        log_bug "题库 API 异常: $(echo $QUESTIONS_RESP | head -c 80)" \
            "可能 questions.json 文件为空或格式错误" \
            "检查: cat backend/data/questions.json | head -5"
    fi
fi

# ==================== 6. AI 出题端到端测试 ====================
log_section "6. AI 出题测试（400 Bug 的终极验证）"

if [ -n "$TOKEN" ]; then
    # Bug 根因 #11: AI 出题返回 400
    AI_RESP=$(curl -s -m 30 -X POST http://127.0.0.1:5000/api/ai/generate/stream \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"category":"vue","difficulty":"medium","count":1}' 2>/dev/null || echo "CURL_FAIL")

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 -X POST http://127.0.0.1:5000/api/ai/generate/stream \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"category":"vue","difficulty":"medium","count":1}' 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "AI 出题 API 返回 200 ✅"
        # 检查是否有 SSE 数据
        if echo "$AI_RESP" | grep -q "data:"; then
            log_pass "AI 出题返回 SSE 流式数据"
        else
            log_warn "AI 出题返回 200 但无 SSE data: 前缀，可能 DeepSeek API 未返回内容"
        fi
    elif [ "$HTTP_CODE" = "400" ]; then
        log_bug "AI 出题返回 400" \
            "前端发送的 body 不是合法 JSON 对象（可能是裸字符串），或前后端字段名不匹配" \
            "1. 检查 useAiChat.js 是否发送 params 对象 2. 检查 aiController.js 是否读 category/difficulty"
    elif [ "$HTTP_CODE" = "401" ]; then
        log_bug "AI 出题返回 401" \
            "JWT token 无效或过期，auth 中间件拒绝请求" \
            "检查 JWT_SECRET 是否正确设置，重新登录获取新 token"
    elif [ "$HTTP_CODE" = "500" ]; then
        log_bug "AI 出题返回 500" \
            "DeepSeek API 调用失败：API Key 无效 / 网络不通 / API 额度用尽" \
            "pm2 logs interview-handbook-api --lines 30 查看 DeepSeek 错误信息"
    else
        log_bug "AI 出题返回 HTTP $HTTP_CODE" \
            "未知状态码，可能是路由不存在或中间件异常" \
            "检查 routes/ai.js 是否注册了 /generate/stream 路由"
    fi
else
    log_warn "无 token，跳过 AI 出题测试（先修复登录问题）"
fi

# ==================== 7. SSE 流式输出验证 ====================
log_section "7. SSE 流式输出验证（打字机效果的根因）"

if [ -n "$TOKEN" ]; then
    # 测试 SSE 是否逐字返回（而非一次性返回）
    SSE_START=$(date +%s%N 2>/dev/null || date +%s)
    SSE_FIRST_DATA=$(curl -s -m 10 -N http://127.0.0.1:5000/api/ai/generate/stream \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"category":"vue","difficulty":"medium","count":1}' 2>/dev/null | head -c 100)
    SSE_END=$(date +%s%N 2>/dev/null || date +%s)

    if echo "$SSE_FIRST_DATA" | grep -q "data:"; then
        log_pass "SSE 返回了 data: 格式数据"
        # 检查是否是流式（首块数据很快到达）
        if [ $((SSE_END - SSE_START)) -lt 5000000000 ] 2>/dev/null; then
            log_pass "SSE 首块数据在合理时间内到达（流式正常）"
        fi
    elif echo "$SSE_FIRST_DATA" | grep -q "CURL_FAIL\|^$"; then
        log_bug "SSE 无数据返回" \
            "后端 SSE 接口可能未正确设置 Content-Type: text/event-stream，或 DeepSeek API 超时" \
            "检查 aiController.js 的 initSSE() 是否调用了 res.writeHead(200, {...})"
    fi

    # 通过 Nginx 测试 SSE
    SSE_NGINX=$(curl -s -m 10 -N http://$PUBLIC_IP/api/ai/generate/stream \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"category":"vue","difficulty":"medium","count":1}' 2>/dev/null | head -c 100)
    if echo "$SSE_NGINX" | grep -q "data:"; then
        log_pass "通过 Nginx 的 SSE 也能收到流式数据"
    else
        log_bug "直连后端 SSE 正常但通过 Nginx 无数据" \
            "Nginx proxy_buffering 没有关闭，缓冲了整个 SSE 响应" \
            "在 Nginx 的 location /api/ 中添加: proxy_buffering off; proxy_cache off;"
    fi
fi

# ==================== 8. SPA 路由刷新测试 ====================
log_section "8. SPA 路由刷新测试（404 Bug 根因）"

# 通过 Nginx 访问前端路由，看是否返回 index.html（而非 404）
for route in "/question-bank" "/dashboard" "/ai-chat" "/login"; do
    ROUTE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://$PUBLIC_IP$route" 2>/dev/null || echo "000")
    if [ "$ROUTE_CODE" = "200" ]; then
        log_pass "路由 $route 返回 200"
    else
        log_bug "路由 $route 返回 $ROUTE_CODE" \
            "Nginx 缺少 try_files \$uri \$uri/ /index.html 配置，SPA 路由刷新时 Nginx 找不到文件" \
            "在 Nginx location / 中添加: try_files \$uri \$uri/ /index.html;"
    fi
done

# ==================== 9. 静态资源加载测试 ====================
log_section "9. 静态资源加载测试"

# 从 index.html 提取第一个 JS 文件名
FIRST_JS=$(grep -o 'src="/assets/[^"]*"' "$DIST_DIR/index.html" 2>/dev/null | head -1 | cut -d'"' -f2)
if [ -n "$FIRST_JS" ]; then
    JS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://$PUBLIC_IP$FIRST_JS" 2>/dev/null || echo "000")
    if [ "$JS_CODE" = "200" ]; then
        log_pass "JS 文件 $FIRST_JS 可访问 (200)"
    else
        log_bug "JS 文件 $FIRST_JS 返回 $JS_CODE" \
            "Nginx root 路径指向错误的 dist 目录，或 dist/assets/ 下没有该文件" \
            "检查 Nginx location / 的 root 是否指向 /var/www/interview-handbook/frontend/dist"
    fi
else
    log_warn "无法从 index.html 提取 JS 文件路径"
fi

# ==================== 10. 浏览器缓存策略验证 ====================
log_section "10. 浏览器缓存策略验证"

# 检查 index.html 的响应头
INDEX_HEADERS=$(curl -s -I -m 5 "http://$PUBLIC_IP/index.html" 2>/dev/null)
if echo "$INDEX_HEADERS" | grep -qi "no-cache\|no-store\|must-revalidate"; then
    log_pass "index.html 禁止缓存（用户总能拿到最新版）"
else
    log_bug "index.html 未禁止缓存" \
        "浏览器缓存了旧版 index.html，导致代码更新后用户仍加载旧版 JS" \
        "Nginx 添加: location = /index.html { add_header Cache-Control 'no-cache, no-store, must-revalidate'; }"
fi

# 检查 assets 是否有长期缓存
if [ -n "$FIRST_JS" ]; then
    ASSET_HEADERS=$(curl -s -I -m 5 "http://$PUBLIC_IP$FIRST_JS" 2>/dev/null)
    if echo "$ASSET_HEADERS" | grep -qi "max-age\|immutable\|public"; then
        log_pass "静态资源有缓存策略（二次访问走缓存）"
    else
        log_warn "静态资源无缓存头（每次都重新下载，浪费带宽）"
    fi
fi

# ==================== 11. Gzip 压缩检查 ====================
log_section "11. Gzip 压缩检查"

if [ -n "$FIRST_JS" ]; then
    GZIP_TEST=$(curl -s -o /dev/null -w "%{size_download}" -m 5 -H "Accept-Encoding: gzip" "http://$PUBLIC_IP$FIRST_JS" 2>/dev/null || echo "0")
    NOGZIP_TEST=$(curl -s -o /dev/null -w "%{size_download}" -m 5 "http://$PUBLIC_IP$FIRST_JS" 2>/dev/null || echo "0")
    if [ "$GZIP_TEST" -lt "$NOGZIP_TEST" ] && [ "$GZIP_TEST" -gt 0 ]; then
        RATIO=$((NOGZIP_TEST * 100 / GZIP_TEST))
        log_pass "Gzip 已启用: ${NOGZIP_TEST}B → ${GZIP_TEST}B (压缩到 ${RATIO}%)"
    else
        log_warn "Gzip 可能未启用: gzip=${GZIP_TEST}B nogzip=${NOGZIP_TEST}B"
    fi
fi

# ==================== 12. 数据文件写入测试 ====================
log_section "12. 数据文件写入测试（答题记录丢失的根因）"

DATA_DIR="$APP_DIR/backend/data"
for json_file in users.json records.json marks.json questions.json; do
    FILE_PATH="$DATA_DIR/$json_file"
    if [ -f "$FILE_PATH" ]; then
        OWNER=$(stat -c "%U" "$FILE_PATH" 2>/dev/null || echo "?")
        if [ "$OWNER" = "deploy" ]; then
            log_pass "$json_file 所有者: deploy"
        else
            log_bug "$json_file 所有者是 $OWNER 而非 deploy" \
                "后端以 deploy 用户运行，文件不属于 deploy 则无法写入，答题记录会丢失" \
                "sudo chown deploy:deploy $FILE_PATH"
        fi

        if [ -w "$FILE_PATH" ]; then
            log_pass "$json_file 可写"
        else
            log_bug "$json_file 不可写" \
                "文件权限不足，后端 fs.writeFileSync 会抛 EACCES 错误" \
                "chmod 644 $FILE_PATH && chown deploy:deploy $FILE_PATH"
        fi
    fi
done

# ==================== 13. PM2 崩溃检查 ====================
log_section "13. PM2 进程稳定性检查"

if command -v pm2 &> /dev/null; then
    # 使用 pm2 show（单进程详情）代替 pm2 status（表格），避免 awk 列号错位
    PM2_SHOW=$(pm2 show interview-handbook-api 2>/dev/null)
    if echo "$PM2_SHOW" | grep -q "interview-handbook-api"; then
        # 从 pm2 show 输出中提取 status 和 restarts
        # pm2 show 格式: │ status  │ online │ → awk -F'│' '{print $3}' = " online " → xargs = "online"
        PM2_STATE=$(echo "$PM2_SHOW" | grep "status" | awk -F'│' '{print $3}' 2>/dev/null | xargs)
        if [ "$PM2_STATE" = "online" ]; then
            log_pass "PM2 进程: online"
            # 从 pm2 show 提取重启次数（格式: "restarts" │ 15）
            RESTART_COUNT=$(echo "$PM2_SHOW" | grep "restarts" | awk -F'│' '{print $2}' 2>/dev/null | tr -d ' ' | xargs)
            # 如果上面没提取到，用 jlist JSON 方式
            if [ -z "$RESTART_COUNT" ] || [ "$RESTART_COUNT" = "?" ]; then
                RESTART_COUNT=$(pm2 jlist 2>/dev/null | grep -o '"restarts":[0-9]*' | head -1 | cut -d':' -f2)
            fi
            if [ -n "$RESTART_COUNT" ] && [ "$RESTART_COUNT" -lt 10 ] 2>/dev/null; then
                log_pass "重启次数: $RESTART_COUNT（正常）"
            elif [ -n "$RESTART_COUNT" ] && [ "$RESTART_COUNT" -ge 10 ] 2>/dev/null; then
                log_bug "PM2 重启次数过多: $RESTART_COUNT" \
                    "进程频繁崩溃重启，通常因为 JWT_SECRET 未设置导致 auth.js process.exit(1)" \
                    "检查 .env.production.active 是否有 JWT_SECRET → pm2 logs --lines 50 看报错"
            else
                log_warn "无法解析重启次数（PM2 版本差异），请手动检查: pm2 show interview-handbook-api"
            fi
        else
            log_bug "PM2 进程状态: $PM2_STATE（非 online）" \
                "进程崩溃或停止，后端 API 完全不可用" \
                "pm2 restart interview-handbook-api → pm2 logs --lines 30 看报错"
        fi
    else
        log_bug "PM2 中没有 interview-handbook-api 进程" \
            "后端从未启动或被误删" \
            "cd $APP_DIR && pm2 start ecosystem.config.js --env production"
    fi
fi

# ==================== 14. 安全头检查 ====================
log_section "14. 安全响应头检查"

SEC_HEADERS=$(curl -s -I -m 5 "http://$PUBLIC_IP/" 2>/dev/null)
for header in "X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection" "Referrer-Policy"; do
    if echo "$SEC_HEADERS" | grep -qi "$header"; then
        log_pass "安全头 $header 存在"
    else
        log_warn "安全头 $header 缺失（非致命，但影响安全评分）"
    fi
done

# ==================== 诊断报告 ====================
log_section "诊断报告"

echo ""
echo -e "${GREEN}通过: $PASS_COUNT${NC}  ${RED}失败/Bug: $FAIL_COUNT${NC}  ${YELLOW}警告: $WARN_COUNT${NC}"

if [ ${#BUG_LIST[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  发现 ${#BUG_LIST[@]} 个 Bug，根因分析如下:${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    for bug in "${BUG_LIST[@]}"; do
        echo -e "$bug"
        echo ""
    done
fi

echo ""
if [ "$FAIL_COUNT" -eq 0 ] && [ "$WARN_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！网页功能正常，无 Bug。${NC}"
elif [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}! 有 $WARN_COUNT 个警告，但无严重 Bug。${NC}"
else
    echo -e "${RED}✗ 发现 $FAIL_COUNT 个 Bug，请按根因分析修复。${NC}"
fi

echo ""
echo -e "${BLUE}Bug 检查完成。${NC}"
echo -e "${CYAN}提示: 修复后重新运行此脚本验证: bash server-bug-check.sh <公网IP>${NC}"
