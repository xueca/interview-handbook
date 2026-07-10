#!/bin/bash
# 文件功能: interview-handbook 一键部署脚本 | 数据流: git pull → npm ci → npm run build → pm2 reload

set -e

APP_DIR="/var/www/interview-handbook"

cd "$APP_DIR"

# 1. 拉取最新代码
echo "==> 拉取最新代码..."
# 重置跟踪文件到 HEAD 版本（运行时 JSON 数据文件已不在版本控制中，不受影响）
git checkout -- .
git pull origin reborn

# 2. 安装后端依赖
echo "==> 安装后端依赖..."
cd "$APP_DIR/backend"
npm ci --production

# 3. 构建前端
echo "==> 构建前端..."
cd "$APP_DIR/frontend"
npm ci
npm run build

# 4. 重启后端服务
echo "==> 重启后端服务..."
cd "$APP_DIR"
pm2 reload ecosystem.config.js --env production

# 5. 状态检查
echo "==> 部署状态检查..."
pm2 status
curl -s http://127.0.0.1:5000/ | head -c 50

echo ""
echo "==> 部署完成"