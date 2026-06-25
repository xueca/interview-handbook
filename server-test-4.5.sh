#!/bin/bash
# 文件功能: interview-handbook 4.5 全流程 API 测试脚本 | 数据流: 注册→登录→各API测试→诊断报告
# 使用方式: 以 deploy 用户执行: bash server-test-4.5.sh [公网IP]
# 作用: 自动测试所有后端 API，诊断问题并输出修复建议
# 测试内容: 注册/登录/题库/答题/统计/错题本/AI出题/AI对话/SSE流式

# 不用 set -e，测试脚本要跑完所有测试再报告

# 获取公网 IP（优先参数，其次自动检测）
PUBLIC_IP="${1:-}"
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s -m 5 ifconfig.me 2>/dev/null || echo "")
fi
if [ -z "$PUBLIC_IP" ]; then
    echo "无法自动获取公网 IP，请手动传入: bash server-test-4.5.sh <公网IP>"
    exit 1
fi

BASE_URL="http://${PUBLIC_IP}"
API_URL="${BASE_URL}/api"

echo "========================================"
echo "  interview-handbook 4.5 全流程测试"
echo "  测试目标: ${BASE_URL}"
echo "========================================"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { echo -e "  ${GREEN}[✓]${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}[✗]${NC} $1"; ((FAIL++)); }
warn() { echo -e "  ${YELLOW}[!]${NC} $1"; ((WARN++)); }
section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 生成随机用户名避免冲突
TEST_USER="test_$(date +%s%N | tail -c 6)"
TEST_PASS="Test1234"
TOKEN=""
QUESTION_ID=""

# ==================== 前置检查 ====================
section "0. 前置连通性检查"

# 0.1 公网访问前端
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "${BASE_URL}/" 2>/dev/null || echo "000")
if [ "$FRONT_STATUS" = "200" ]; then
    pass "公网访问前端: HTTP 200"
else
    fail "公网访问前端: HTTP $FRONT_STATUS"
    echo -e "  ${RED}→ 如果 000: 检查阿里云安全组是否开放 80 端口${NC}"
    echo -e "  ${RED}→ 如果 502: 后端未运行，检查 pm2 status${NC}"
    echo -e "  ${RED}→ 如果 404: Nginx 配置有误${NC}"
fi

# 0.2 后端直连健康检查
HEALTH=$(curl -s -m 5 http://127.0.0.1:5000/ 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q "Hello World"; then
    pass "后端本地健康检查: OK"
else
    fail "后端本地健康检查失败: $HEALTH"
    echo -e "  ${RED}→ 检查: pm2 status && pm2 logs interview-handbook-api --lines 20${NC}"
fi

# 0.3 Nginx 反向代理检查
NGINX_API=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${API_URL}/questions" 2>/dev/null || echo "000")
if [ "$NGINX_API" = "401" ] || [ "$NGINX_API" = "403" ]; then
    pass "Nginx API 代理正常 (返回 $NGINX_API，未认证预期)"
elif [ "$NGINX_API" = "200" ]; then
    pass "Nginx API 代理正常 (HTTP 200)"
else
    fail "Nginx API 代理异常: HTTP $NGINX_API"
    echo -e "  ${RED}→ 检查 Nginx 配置: sudo cat /etc/nginx/sites-available/interview-handbook${NC}"
fi

# ==================== 1. 注册测试 ====================
section "1. 注册测试"

REGISTER_RESP=$(curl -s -w "\n%{http_code}" -m 10 -X POST "${API_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${TEST_USER}\",\"password\":\"${TEST_PASS}\"}" 2>/dev/null || echo -e "\n000")

REGISTER_HTTP=$(echo "$REGISTER_RESP" | tail -1)
REGISTER_BODY=$(echo "$REGISTER_RESP" | sed '$d')

if [ "$REGISTER_HTTP" = "201" ]; then
    pass "注册成功: HTTP 201"
    TOKEN=$(echo "$REGISTER_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        pass "获取到 JWT Token (${TOKEN:0:20}...)"
    else
        fail "注册响应中未找到 token"
    fi
elif [ "$REGISTER_HTTP" = "409" ]; then
    warn "用户名已存在 (HTTP 409)，尝试登录已有用户"
    # 尝试登录
    LOGIN_RESP=$(curl -s -w "\n%{http_code}" -m 10 -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${TEST_USER}\",\"password\":\"${TEST_PASS}\"}" 2>/dev/null || echo -e "\n000")
    LOGIN_HTTP=$(echo "$LOGIN_RESP" | tail -1)
    LOGIN_BODY=$(echo "$LOGIN_RESP" | sed '$d')
    if [ "$LOGIN_HTTP" = "200" ]; then
        TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        pass "登录成功，获取到 Token"
    else
        fail "登录失败: HTTP $LOGIN_HTTP"
    fi
elif [ "$REGISTER_HTTP" = "400" ]; then
    fail "注册失败: HTTP 400 (请求格式错误或参数校验失败)"
    echo -e "  ${RED}→ 请求体: {\"username\":\"${TEST_USER}\",\"password\":\"${TEST_PASS}\"}${NC}"
    echo -e "  ${RED}→ 响应: $REGISTER_BODY${NC}"
    echo -e "  ${YELLOW}→ 可能原因: 密码不符合强度要求（需6-32位，包含字母和数字）${NC}"
else
    fail "注册失败: HTTP $REGISTER_HTTP"
    echo -e "  ${RED}→ 响应: $REGISTER_BODY${NC}"
fi

# 如果没有 token，后续测试跳过
if [ -z "$TOKEN" ]; then
    echo -e "\n${RED}无法获取 Token，后续测试跳过。请先修复注册/登录问题。${NC}"
    exit 1
fi

# ==================== 2. 登录测试 ====================
section "2. 登录测试"

LOGIN_RESP=$(curl -s -w "\n%{http_code}" -m 10 -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${TEST_USER}\",\"password\":\"${TEST_PASS}\"}" 2>/dev/null || echo -e "\n000")

LOGIN_HTTP=$(echo "$LOGIN_RESP" | tail -1)
if [ "$LOGIN_HTTP" = "200" ]; then
    pass "登录成功: HTTP 200"
else
    fail "登录失败: HTTP $LOGIN_HTTP"
fi

# 测试 /me
ME_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/auth/me" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
ME_HTTP=$(echo "$ME_RESP" | tail -1)
if [ "$ME_HTTP" = "200" ]; then
    pass "获取用户信息: HTTP 200"
else
    fail "获取用户信息: HTTP $ME_HTTP"
fi

# ==================== 3. 题库测试 ====================
section "3. 题库测试"

# 3.1 获取题库列表
LIST_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/questions" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
LIST_HTTP=$(echo "$LIST_RESP" | tail -1)
LIST_BODY=$(echo "$LIST_RESP" | sed '$d')

if [ "$LIST_HTTP" = "200" ]; then
    pass "获取题库列表: HTTP 200"
    TOTAL=$(echo "$LIST_BODY" | grep -o '"total":[0-9]*' | cut -d: -f2)
    if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
        pass "题库有 $TOTAL 道题目"
    else
        warn "题库为空或 total 字段缺失"
    fi
else
    fail "获取题库列表: HTTP $LIST_HTTP"
fi

# 3.2 筛选分类
CAT_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/questions?category=JavaScript" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
CAT_HTTP=$(echo "$CAT_RESP" | tail -1)
if [ "$CAT_HTTP" = "200" ]; then
    pass "按分类筛选: HTTP 200"
else
    fail "按分类筛选: HTTP $CAT_HTTP"
fi

# 3.3 搜索
SEARCH_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/questions?keyword=闭包" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
SEARCH_HTTP=$(echo "$SEARCH_RESP" | tail -1)
if [ "$SEARCH_HTTP" = "200" ]; then
    pass "按关键词搜索: HTTP 200"
else
    fail "按关键词搜索: HTTP $SEARCH_HTTP"
fi

# 3.4 获取题目详情（取第一道题）
QUESTION_ID=$(echo "$LIST_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$QUESTION_ID" ]; then
    DETAIL_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/questions/${QUESTION_ID}" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
    DETAIL_HTTP=$(echo "$DETAIL_RESP" | tail -1)
    if [ "$DETAIL_HTTP" = "200" ]; then
        pass "获取题目详情 (ID=$QUESTION_ID): HTTP 200"
    else
        fail "获取题目详情: HTTP $DETAIL_HTTP"
    fi
else
    warn "无法获取题目 ID，跳过详情测试"
fi

# ==================== 4. 答题测试 ====================
section "4. 答题测试"

if [ -n "$QUESTION_ID" ]; then
    SUBMIT_RESP=$(curl -s -w "\n%{http_code}" -m 10 -X POST "${API_URL}/records" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{\"score\":80,\"correct\":4,\"total\":5,\"answered\":5,\"timeUsed\":120,\"category\":\"JavaScript\",\"details\":[{\"questionId\":${QUESTION_ID},\"userAnswer\":0,\"isCorrect\":true,\"consecutiveCorrect\":1}]}" 2>/dev/null || echo -e "\n000")
    SUBMIT_HTTP=$(echo "$SUBMIT_RESP" | tail -1)
    if [ "$SUBMIT_HTTP" = "200" ]; then
        pass "提交答题记录: HTTP 200"
    else
        fail "提交答题记录: HTTP $SUBMIT_HTTP"
    fi
else
    warn "无题目 ID，跳过答题测试"
fi

# ==================== 5. 统计测试 ====================
section "5. 统计测试"

STATS_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/records/stats" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
STATS_HTTP=$(echo "$STATS_RESP" | tail -1)
if [ "$STATS_HTTP" = "200" ]; then
    pass "获取统计: HTTP 200"
else
    fail "获取统计: HTTP $STATS_HTTP"
fi

# ==================== 6. 错题本测试 ====================
section "6. 错题本测试"

WRONG_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/records/wrong" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
WRONG_HTTP=$(echo "$WRONG_RESP" | tail -1)
if [ "$WRONG_HTTP" = "200" ]; then
    pass "获取错题本: HTTP 200"
else
    fail "获取错题本: HTTP $WRONG_HTTP"
fi

# ==================== 7. AI 出题测试 ====================
section "7. AI 出题测试"

# 7.1 非流式出题
GEN_RESP=$(curl -s -w "\n%{http_code}" -m 30 -X POST "${API_URL}/ai/generate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"category":"JavaScript","difficulty":"easy","count":1}' 2>/dev/null || echo -e "\n000")
GEN_HTTP=$(echo "$GEN_RESP" | tail -1)
GEN_BODY=$(echo "$GEN_RESP" | sed '$d')

if [ "$GEN_HTTP" = "200" ]; then
    pass "AI 非流式出题: HTTP 200"
    if echo "$GEN_BODY" | grep -q '"code":0'; then
        pass "AI 响应 code=0 (成功)"
    elif echo "$GEN_BODY" | grep -q '"code":-1'; then
        fail "AI 响应 code=-1 (失败)"
        echo -e "  ${RED}→ 响应: $GEN_BODY${NC}"
        echo -e "  ${YELLOW}→ 可能原因: DEEPSEEK_API_KEY 无效或 API 调用失败${NC}"
    fi
elif [ "$GEN_HTTP" = "400" ]; then
    fail "AI 非流式出题: HTTP 400"
    echo -e "  ${RED}→ 响应: $GEN_BODY${NC}"
    echo -e "  ${YELLOW}→ 诊断: 这和你图片中的 400 错误相同${NC}"
    echo -e "  ${YELLOW}→ 可能原因 1: Nginx proxy_request_buffering off 导致 POST body 不完整${NC}"
    echo -e "  ${YELLOW}→ 可能原因 2: 请求体解析失败（检查 Content-Type）${NC}"
    echo -e "  ${YELLOW}→ 修复建议: 检查 Nginx 配置，尝试添加 proxy_set_header Content-Length \$content_length${NC}"
else
    fail "AI 非流式出题: HTTP $GEN_HTTP"
    echo -e "  ${RED}→ 响应: $GEN_BODY${NC}"
fi

# 7.2 流式出题 SSE
echo ""
echo "  [测试] AI 流式出题 SSE (等待 8 秒)..."
SSE_GEN_OUTPUT=$(curl -s -N -m 8 -X POST "${API_URL}/ai/generate/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: text/event-stream" \
    -d '{"category":"JavaScript","difficulty":"easy","count":1}' 2>/dev/null || true)

if echo "$SSE_GEN_OUTPUT" | grep -q "data:"; then
    pass "AI 流式出题 SSE: 收到流式数据"
    SSE_LINES=$(echo "$SSE_GEN_OUTPUT" | grep -c "data:" || echo 0)
    pass "SSE 收到 $SSE_LINES 条数据"
else
    fail "AI 流式出题 SSE: 未收到流式数据"
    echo -e "  ${YELLOW}→ 可能原因: DEEPSEEK_API_KEY 未设置或无效${NC}"
    echo -e "  ${YELLOW}→ 检查: cat backend/.env.production.active | grep DEEPSEEK_API_KEY${NC}"
fi

# ==================== 8. AI 对话测试 ====================
section "8. AI 对话测试"

# 8.1 非流式对话
CHAT_RESP=$(curl -s -w "\n%{http_code}" -m 30 -X POST "${API_URL}/ai/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"question":"什么是闭包？"}' 2>/dev/null || echo -e "\n000")
CHAT_HTTP=$(echo "$CHAT_RESP" | tail -1)
CHAT_BODY=$(echo "$CHAT_RESP" | sed '$d')

if [ "$CHAT_HTTP" = "200" ]; then
    pass "AI 非流式对话: HTTP 200"
    if echo "$CHAT_BODY" | grep -q '"code":0'; then
        pass "AI 对话响应 code=0"
    fi
else
    fail "AI 非流式对话: HTTP $CHAT_HTTP"
    echo -e "  ${RED}→ 响应: $CHAT_BODY${NC}"
fi

# 8.2 流式对话 SSE
echo ""
echo "  [测试] AI 流式对话 SSE (等待 8 秒)..."
SSE_CHAT_OUTPUT=$(curl -s -N -m 8 -X POST "${API_URL}/ai/chat/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: text/event-stream" \
    -d '{"question":"什么是闭包？"}' 2>/dev/null || true)

if echo "$SSE_CHAT_OUTPUT" | grep -q "data:"; then
    pass "AI 流式对话 SSE: 收到流式数据"
    SSE_LINES=$(echo "$SSE_CHAT_OUTPUT" | grep -c "data:" || echo 0)
    pass "SSE 收到 $SSE_LINES 条数据"
else
    fail "AI 流式对话 SSE: 未收到流式数据"
fi

# ==================== 9. 标记测试 ====================
section "9. 标记/收藏测试"

if [ -n "$QUESTION_ID" ]; then
    MARK_RESP=$(curl -s -w "\n%{http_code}" -m 10 -X POST "${API_URL}/records/mark" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{\"questionId\":${QUESTION_ID},\"isMarked\":true}" 2>/dev/null || echo -e "\n000")
    MARK_HTTP=$(echo "$MARK_RESP" | tail -1)
    if [ "$MARK_HTTP" = "200" ]; then
        pass "标记题目: HTTP 200"
    else
        fail "标记题目: HTTP $MARK_HTTP"
    fi

    MARKS_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/records/marks" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
    MARKS_HTTP=$(echo "$MARKS_RESP" | tail -1)
    if [ "$MARKS_HTTP" = "200" ]; then
        pass "获取标记列表: HTTP 200"
    else
        fail "获取标记列表: HTTP $MARKS_HTTP"
    fi
else
    warn "无题目 ID，跳过标记测试"
fi

# ==================== 10. 记录列表测试 ====================
section "10. 答题记录列表测试"

RECORDS_RESP=$(curl -s -w "\n%{http_code}" -m 10 "${API_URL}/records" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo -e "\n000")
RECORDS_HTTP=$(echo "$RECORDS_RESP" | tail -1)
if [ "$RECORDS_HTTP" = "200" ]; then
    pass "获取答题记录: HTTP 200"
else
    fail "获取答题记录: HTTP $RECORDS_HTTP"
fi

# ==================== 诊断报告 ====================
section "诊断报告"

echo ""
echo -e "${GREEN}通过: $PASS${NC}  ${RED}失败: $FAIL${NC}  ${YELLOW}警告: $WARN${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！系统运行正常。${NC}"
else
    echo -e "${RED}✗ 发现 $FAIL 个失败项，需要排查。${NC}"
    echo ""

    # 诊断常见问题的修复建议
    echo -e "${YELLOW}常见问题排查:${NC}"
    echo ""

    echo -e "${YELLOW}1. AI 接口返回 400 Bad Request:${NC}"
    echo "   可能原因:"
    echo "   a) Nginx proxy_request_buffering off 导致 POST body 不完整"
    echo "   b) DEEPSEEK_API_KEY 未设置或无效"
    echo "   修复:"
    echo "      sudo vim /etc/nginx/sites-available/interview-handbook"
    echo "      # 在 location /api/ 中添加:"
    echo "      proxy_set_header Content-Length \$content_length;"
    echo "      sudo nginx -t && sudo systemctl restart nginx"
    echo ""
    echo "      # 检查 API Key:"
    echo "      cat /var/www/interview-handbook/backend/.env.production.active"
    echo ""

    echo -e "${YELLOW}2. AI 接口返回 500 / code:-1:${NC}"
    echo "   可能原因: DEEPSEEK_API_KEY 无效或 DeepSeek API 调用失败"
    echo "   修复:"
    echo "      cat backend/.env.production.active | grep DEEPSEEK_API_KEY"
    echo "      # 确保 key 以 sk- 开头且有效"
    echo ""

    echo -e "${YELLOW}3. SSE 流式输出不工作:${NC}"
    echo "   可能原因: Nginx proxy_buffering 未关闭"
    echo "   修复:"
    echo "      sudo grep proxy_buffering /etc/nginx/sites-available/interview-handbook"
    echo "      # 确保有: proxy_buffering off;"
    echo ""

    echo -e "${YELLOW}4. 认证失败 (401):${NC}"
    echo "   可能原因: JWT_SECRET 不一致或 token 过期"
    echo "   修复:"
    echo "      pm2 restart interview-handbook-api"
    echo ""

    echo -e "${YELLOW}5. 前端页面白屏或 404:${NC}"
    echo "   可能原因: 前端未构建或 dist 目录不存在"
    echo "   修复:"
    echo "      cd frontend && npm run build"
    echo "      ls -la dist/index.html"
    echo ""
fi

# 清理：删除测试用户（可选）
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "测试完成。测试用户: ${TEST_USER}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
