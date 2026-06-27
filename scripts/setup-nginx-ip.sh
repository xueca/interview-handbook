#!/bin/bash
# 文件功能: 基于公网 IP 自动部署 Nginx 配置（无需域名）| 数据流: nginx/interview-handbook.conf → sed替换IP → /etc/nginx/sites-available
# 用法: bash scripts/setup-nginx-ip.sh [IP地址]
#       不传 IP 时默认使用 8.138.219.100

set -e

IP="${1:-8.138.219.100}"

# 1. 检查模板文件是否存在
TEMPLATE="nginx/interview-handbook.conf"
if [ ! -f "$TEMPLATE" ]; then
  echo "❌ 未找到 Nginx 模板文件: $TEMPLATE"
  echo "   请从项目根目录运行此脚本"
  exit 1
fi

# 2. 读取模板并替换占位符（your-domain.com → 实际 IP）
echo "==> 基于公网 IP $IP 生成 Nginx 配置..."
sed "s/server_name your-domain.com www.your-domain.com;/server_name $IP;/g" \
  "$TEMPLATE" > /tmp/interview-handbook.conf

# 3. 复制到 Nginx 配置目录
echo "==> 部署到 Nginx..."
sudo cp /tmp/interview-handbook.conf /etc/nginx/sites-available/interview-handbook

# 4. 启用站点，删除 default 避免冲突
sudo ln -sf /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 5. 验证配置语法
echo "==> 验证 Nginx 配置..."
sudo nginx -t

# 6. 重启 Nginx
echo "==> 重启 Nginx..."
sudo systemctl restart nginx

# 7. 输出验证命令
echo ""
echo "===== Nginx 配置完成 ====="
echo "公网地址: http://$IP"
echo ""
echo "验证命令（在服务器上执行）:"
echo "  curl http://127.0.0.1:5000/           # 后端检查"
echo "  curl -I http://127.0.0.1/             # Nginx 代理检查"
echo ""
echo "验证命令（在本地浏览器）:"
echo "  http://$IP                            # 打开前端页面"

# 清理临时文件
rm -f /tmp/interview-handbook.conf