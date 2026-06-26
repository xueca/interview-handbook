#!/bin/bash
# 文件功能: 阶段五 — 域名 + HTTPS 一键配置脚本 | 数据流: 检查当前状态 → 配置域名 → Certbot HTTPS → 验证
# 使用方式: bash server-setup-phase5.sh [你的域名]
# 示例:
#   bash server-setup-phase5.sh                       # 仅用 IP，不配域名/HTTPS
#   bash server-setup-phase5.sh example.com           # 配域名 + HTTPS
# 前置条件: 已部署后端(PM2 running) + 前端(Nginx 可访问) + 4.5 全流程测试通过

set -e

# ==================== 配置 ====================
PUBLIC_IP="8.138.219.100"
WORK_DIR="/var/www/interview-handbook"
NGINX_CONF="/etc/nginx/sites-available/interview-handbook"
DOMAIN="${1:-}"

# ==================== 颜色 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}[✓]${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}[✗]${NC} $1"; ((FAIL++)); }
info() { echo -e "  ${BLUE}[i]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[!]${NC} $1"; }
section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==================== 前置检查 ====================
section "0. 前置检查"

# 0.1 用户确认
whoami | grep -q 'deploy' || {
    fail "当前用户不是 deploy，请先执行: su - deploy"
    exit 1
}
pass "当前用户: deploy"

# 0.2 Nginx 配置文件存在
if [ -f "$NGINX_CONF" ]; then
    pass "Nginx 配置文件存在: $NGINX_CONF"
else
    fail "Nginx 配置文件不存在: $NGINX_CONF"
    info "请先完成步骤 4.2-4.3（部署前端 + Nginx）"
    info "可执行: sudo cp ${WORK_DIR}/nginx/interview-handbook.conf ${NGINX_CONF}"
    exit 1
fi

# 0.3 Nginx 已启动
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    pass "Nginx 配置语法正确"
else
    fail "Nginx 配置语法错误"
    sudo nginx -t
    exit 1
fi

if systemctl is-active --quiet nginx; then
    pass "Nginx 服务运行中"
else
    warn "Nginx 未运行，尝试启动..."
    sudo systemctl start nginx
    sleep 1
    if systemctl is-active --quiet nginx; then
        pass "Nginx 已启动"
    else
        fail "Nginx 启动失败"
        exit 1
    fi
fi

# 0.4 PM2 后端运行中
if pm2 status 2>/dev/null | grep -q "interview-handbook.*online"; then
    pass "PM2 后端运行中"
else
    fail "PM2 后端未运行，请先启动: pm2 start ecosystem.config.js"
    exit 1
fi

# 0.5 当前 server_name 确认
CURRENT_SERVER=$(grep "server_name" "$NGINX_CONF" | head -1 | sed 's/.*server_name //;s/;//')
info "当前 Nginx server_name: $CURRENT_SERVER"

# ==================== 域名检查 ====================
section "1. 域名配置检查"

if [ -z "$DOMAIN" ]; then
    warn "未传入域名参数，仅使用公网 IP: ${PUBLIC_IP}"
    info "如果需要配置域名 + HTTPS，请重新执行:"
    info "  bash server-setup-phase5.sh your-domain.com"
    info ""
    info "先确保 DNS 已添加 A 记录: your-domain.com → ${PUBLIC_IP}"
    echo ""
    USE_DOMAIN=false
else
    USE_DOMAIN=true
    info "域名: ${DOMAIN}"

    # 检查 DNS 解析是否指向本机
    DNS_IP=$(dig +short "$DOMAIN" 2>/dev/null || nslookup "$DOMAIN" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
    if [ -z "$DNS_IP" ]; then
        warn "无法自动检测 DNS 解析（dig/nslookup 可能未安装）"
        warn "请手动确认 DNS 的 A 记录已指向 ${PUBLIC_IP}"
        echo ""
        echo "  操作步骤:"
        echo "    1. 打开域名 DNS 控制台（阿里云/腾讯云/DNSPod 等）"
        echo "    2. 添加 A 记录: ${DOMAIN} → ${PUBLIC_IP}"
        echo "    3. 等待生效（通常 1-10 分钟）"
        echo ""
        read -p "  确认 A 记录已添加？(y/n): " DNS_CONFIRM
        if [ "$DNS_CONFIRM" != "y" ] && [ "$DNS_CONFIRM" != "Y" ]; then
            fail "请先配置 DNS 后再执行本脚本"
            exit 1
        fi
    elif [ "$DNS_IP" = "$PUBLIC_IP" ]; then
        pass "DNS A 记录已正确指向 ${PUBLIC_IP}"
    else
        fail "DNS A 记录指向 ${DNS_IP}，而非本机 ${PUBLIC_IP}"
        info "请修改 DNS 记录后再执行本脚本"
        exit 1
    fi
fi

# ==================== 配置 Nginx server_name ====================
section "2. 更新 Nginx server_name"

if [ "$USE_DOMAIN" = true ]; then
    # 配置域名
    info "将 server_name 更新为: ${DOMAIN} www.${DOMAIN}"
    sudo sed -i "s/server_name .*;/server_name ${DOMAIN} www.${DOMAIN};/" "$NGINX_CONF"
else
    # 仅使用 IP
    info "将 server_name 更新为: ${PUBLIC_IP}"
    sudo sed -i "s/server_name .*;/server_name ${PUBLIC_IP};/" "$NGINX_CONF"
fi

NEW_SERVER=$(grep "server_name" "$NGINX_CONF" | head -1 | sed 's/.*server_name //;s/;//')
pass "server_name 已更新为: $NEW_SERVER"

# 重启 Nginx 使 server_name 生效
sudo nginx -t && sudo systemctl restart nginx
pass "Nginx 已重启"

# ==================== 安装 HTTPS 证书（仅域名模式） ====================
section "3. HTTPS 证书配置"

if [ "$USE_DOMAIN" = true ]; then
    # 检查 certbot 是否安装
    if ! command -v certbot &> /dev/null; then
        info "安装 certbot..."
        sudo apt update -qq && sudo apt install -y -qq certbot python3-certbot-nginx
    fi

    if command -v certbot &> /dev/null; then
        pass "certbot 已安装"
    else
        fail "certbot 安装失败"
        exit 1
    fi

    # 执行 certbot
    echo ""
    info "即将执行: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
    info "按提示输入邮箱，同意条款，选择是否重定向 HTTP → HTTPS"
    echo ""
    sudo certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}"

    # 验证证书
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        pass "HTTPS 证书已安装"
        info "证书路径: /etc/letsencrypt/live/${DOMAIN}/"
    else
        fail "证书安装失败，请手动执行: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
        exit 1
    fi
else
    # 无域名，跳过 HTTPS
    warn "未配置域名，跳过 HTTPS。后续可通过以下方式配置:"
    info "  bash server-setup-phase5.sh your-domain.com"
fi

# ==================== 验证自动续期（仅域名模式） ====================
section "4. 证书自动续期验证"

if [ "$USE_DOMAIN" = true ]; then
    # 检查 certbot timer
    if systemctl list-timers 2>/dev/null | grep -q certbot; then
        pass "certbot 定时任务已设置（自动续期）"
    else
        warn "certbot 定时任务未找到，尝试手动启用..."
        sudo systemctl enable certbot.timer 2>/dev/null || true
        sudo systemctl start certbot.timer 2>/dev/null || true
        sleep 1
        if systemctl list-timers 2>/dev/null | grep -q certbot; then
            pass "certbot 定时任务已启用"
        else
            warn "未找到 certbot timer，后续可手动续期: sudo certbot renew"
        fi
    fi

    # dry-run 模拟续期
    echo ""
    info "模拟证书续期测试..."
    sudo certbot renew --dry-run 2>&1 | tail -5
    echo ""
fi

# ==================== 最终验证 ====================
section "5. 最终验证"

# 5.1 Nginx 状态
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    pass "Nginx 配置正确"
else
    fail "Nginx 配置错误"
fi

if systemctl is-active --quiet nginx; then
    pass "Nginx 运行中"
else
    fail "Nginx 未运行"
fi

# 5.2 后端连通性
HEALTH=$(curl -s -m 5 http://127.0.0.1:5000/ 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q "Hello World"; then
    pass "后端本地连通: 200 OK"
else
    fail "后端本地不通: $HEALTH"
fi

# 5.3 Nginx 代理测试
# 确定用域名还是 IP 测试
if [ "$USE_DOMAIN" = true ]; then
    TEST_URL="${DOMAIN}"
    # 优先 HTTPS
    if curl -s -o /dev/null -w "%{http_code}" -m 5 "https://${TEST_URL}/" 2>/dev/null | grep -q "200"; then
        pass "HTTPS 公网访问: https://${TEST_URL}/ → 200"
    elif curl -s -o /dev/null -w "%{http_code}" -m 5 "http://${TEST_URL}/" 2>/dev/null | grep -q "200"; then
        pass "HTTP 公网访问: http://${TEST_URL}/ → 200"
    else
        fail "公网访问失败，请检查 Nginx 和 DNS"
    fi
else
    TEST_URL="${PUBLIC_IP}"
    FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://${TEST_URL}/" 2>/dev/null || echo "000")
    if [ "$FRONT_STATUS" = "200" ]; then
        pass "公网访问: http://${TEST_URL}/ → 200"
    else
        warn "公网 HTTP 返回: $FRONT_STATUS"
        warn "请检查阿里云安全组是否开放 80 端口"
    fi
fi

# 5.4 API 代理测试
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://${TEST_URL}/api/questions" 2>/dev/null || echo "000")
if [ "$API_STATUS" = "401" ] || [ "$API_STATUS" = "200" ]; then
    pass "Nginx API 代理正常 (HTTP $API_STATUS)"
else
    warn "Nginx API 代理返回: HTTP $API_STATUS"
    warn "检查: sudo cat ${NGINX_CONF}"
fi

# ==================== 诊断报告 ====================
section "诊断报告"

echo ""
echo -e "${GREEN}通过: $PASS${NC}  ${RED}失败: $FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✓ 阶段五配置完成！${NC}"
    echo ""

    if [ "$USE_DOMAIN" = true ]; then
        echo "  访问地址:"
        echo -e "    https://${DOMAIN}       ${GREEN}(推荐)${NC}"
        echo -e "    http://${DOMAIN}"
        echo ""
        echo "  证书自动续期已配置，无需手动操作。"
    else
        echo "  访问地址:"
        echo -e "    http://${PUBLIC_IP}"
        echo ""
        echo -e "${YELLOW}  后续建议:${NC}"
        echo "    1. 购买域名，配置 A 记录指向 ${PUBLIC_IP}"
        echo "    2. 执行: bash server-setup-phase5.sh your-domain.com"
        echo "    3. 即可获取 HTTPS + 自动续期"
    fi

    echo ""
    echo -e "${YELLOW}  后续步骤:${NC}"
    echo "    1. 浏览器打开访问地址，验证页面正常"
    echo "    2. 注册 → 登录 → 答题 → AI 对话，全流程测试"
    echo "    3. 进入阶段六：线上 Bug 修复 + Demo 视频"
else
    echo -e "${RED}✗ 发现 $FAIL 个失败项，请根据上方提示排查。${NC}"
    exit 1
fi
