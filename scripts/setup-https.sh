#!/bin/bash
# 文件功能: 域名 HTTPS 一键配置（需要先购买域名并配置 DNS）| 数据流: DNS验证 → Nginx server_name替换 → Certbot
# 用法: bash scripts/setup-https.sh your-domain.com
# 前置条件: 域名已购买，DNS A 记录已指向服务器 IP

set -e

DOMAIN="$1"

if [ -z "$DOMAIN" ]; then
  echo "用法: bash scripts/setup-https.sh your-domain.com"
  echo "前置条件:"
  echo "  1. 已在阿里云万网购买域名"
  echo "  2. 已在阿里云 DNS 控制台添加 A 记录指向服务器 IP"
  echo ""
  exit 1
fi

# 1. 获取本机公网 IP
echo "==> 获取本机公网 IP..."
IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ip.sb 2>/dev/null)
if [ -z "$IP" ]; then
  echo "⚠️  无法获取本机公网 IP，跳过 DNS 验证"
else
  echo "本机 IP: $IP"
fi

# 2. 验证 DNS 解析
echo "==> 验证 DNS 解析..."
RESOLVED_IP=$(dig +short "$DOMAIN" | head -1)
if [ -n "$RESOLVED_IP" ] && [ -n "$IP" ] && [ "$RESOLVED_IP" != "$IP" ]; then
  echo "⚠️  域名 $DOMAIN 解析到 $RESOLVED_IP"
  echo "   但本机公网 IP 是 $IP"
  echo ""
  echo "请在阿里云 DNS 控制台添加 A 记录:"
  echo "  记录类型: A"
  echo "  主机记录: @（和 www）"
  echo "  记录值:   $IP"
  echo "  https://dns.console.aliyun.com/"
  echo ""
  echo "DNS 生效需要 1-10 分钟，请稍后重试"
  exit 1
fi
echo "✅ DNS 解析正确（$DOMAIN → $RESOLVED_IP）"

# 3. 检查 Nginx 站点配置是否存在
NGINX_CONF="/etc/nginx/sites-available/interview-handbook"
if [ ! -f "$NGINX_CONF" ]; then
  echo "❌ 未找到 Nginx 配置: $NGINX_CONF"
  echo "   请先运行 scripts/setup-nginx-ip.sh 部署基础 Nginx 配置"
  exit 1
fi

# 4. 修改 Nginx server_name 为域名
echo "==> 配置 Nginx server_name..."
sudo sed -i "s/server_name [^;]*;/server_name $DOMAIN www.$DOMAIN;/g" "$NGINX_CONF"
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx 已更新为域名 $DOMAIN"

# 5. 运行 Certbot 申请 HTTPS 证书
echo "==> 申请 HTTPS 证书（Let's Encrypt）..."
echo "   需要输入邮箱地址（用于证书过期提醒）"
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN"
echo "✅ HTTPS 证书已安装"

# 6. 验证自动续期
echo "==> 验证自动续期..."
sudo certbot renew --dry-run
echo "✅ 自动续期验证通过"

# 7. 输出结果
echo ""
echo "===== HTTPS 配置完成 ====="
echo "访问地址: https://$DOMAIN"
echo "证书路径: /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "Certbot 会自动续期（每天检查两次），无需手动操作"
echo "验证续期: sudo certbot renew --dry-run"