# Phase 5 无域名一键完成计划

## Summary

用户无域名，需基于公网 IP `8.138.219.100` 完成 Phase 5（域名 + HTTPS 阶段）的全部工作。之前的 `scripts/setup-nginx-ip.sh` 只做 Nginx 配置，范围太小。需要一个**全自动脚本**，一次性完成：拉最新代码 → 填环境变量 → 构建前端 → 配 Nginx → 启 PM2 → 全流程验证。

---

## Current State Analysis

### 已确认的服务器状态

| 项 | 状态 |
|---|------|
| 服务器 IP | `8.138.219.100`（阿里云 ECS） |
| Ubuntu + Nginx + Node.js + PM2 | 已安装（Day29 完成） |
| 代码仓库 | 已 `git clone`，但上次 pull 被 `ecosystem.config.js` 本地修改阻塞 |
| 环境变量 | `.env.production.example` 已拉到，`.env.production.active` 已创建但可能未填密钥 |
| 前端构建 | ❌ 未执行 |
| Nginx 配置 | ❌ 未配置 |
| PM2 后端 | ❌ 可能未启动或未使用最新 ecosystem.config.js |

### 现有脚本不足

`scripts/setup-nginx-ip.sh` — 只做 Nginx 配置，不涉及前端构建、PM2 启动、环境变量检查。用户需要执行至少 5 个独立步骤才能完成 Phase 5。

---

## Proposed Changes

### 改动 1：创建 `scripts/setup-phase5.sh` — Phase 5 一键完成脚本

**What**：一个全自动脚本，涵盖从拉代码到浏览器可访问的全部步骤。用法：在服务器上执行一次即可。

**Why**：代替手动执行 5+ 步，避免遗漏，降低出错概率。

**How**：

```bash
#!/bin/bash
# 文件功能: Phase5 一键完成（无域名版）| 用法: bash scripts/setup-phase5.sh [IP]
set -e

IP="${1:-8.138.219.100}"
APP_DIR="/var/www/interview-handbook"
ENV_FILE="backend/.env.production.active"

cd "$APP_DIR"

echo "========================================"
echo "  Phase 5 一键部署 — 无域名版"
echo "  IP: $IP"
echo "========================================"

# 步骤 1：拉取最新代码
echo -e "\n[1/7] 拉取最新代码..."
git stash 2>/dev/null || true
git pull origin reborn

# 步骤 2：检查环境变量
echo -e "\n[2/7] 检查环境变量..."
if [ ! -f "$ENV_FILE" ]; then
  cp backend/.env.production.example "$ENV_FILE"
  echo "⚠️  已创建 $ENV_FILE，请编辑填入真实密钥后再运行"
  echo "   vim $APP_DIR/$ENV_FILE"
  exit 1
fi
JWT=$(grep "^JWT_SECRET=" "$ENV_FILE" | grep -v "<" | head -1)
if [ -z "$JWT" ]; then
  echo "⚠️  JWT_SECRET 未填写，请编辑: vim $APP_DIR/$ENV_FILE"
  exit 1
fi
echo "✅  环境变量检查通过"

# 步骤 3：安装后端依赖
echo -e "\n[3/7] 安装后端依赖..."
cd "$APP_DIR/backend"
npm ci --production 2>&1 | tail -1

# 步骤 4：构建前端
echo -e "\n[4/7] 构建前端..."
cd "$APP_DIR/frontend"
npm ci 2>&1 | tail -1
npm run build 2>&1 | tail -3

# 步骤 5：重启后端（PM2）
echo -e "\n[5/7] 启动后端（PM2）..."
cd "$APP_DIR"
pm2 delete interview-handbook-api 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

# 步骤 6：配置 Nginx
echo -e "\n[6/7] 配置 Nginx..."
bash scripts/setup-nginx-ip.sh "$IP"

# 步骤 7：全流程验证
echo -e "\n[7/7] 验证..."
echo "--- 后端健康检查 ---"
curl -s http://127.0.0.1:5000/ | head -c 100
echo ""
echo "--- Nginx 代理检查 ---"
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/
echo ""
echo "--- PM2 状态 ---"
pm2 status | head -5

echo ""
echo "========================================"
echo "  ✅ Phase 5 完成"
echo "  浏览器打开: http://$IP"
echo "========================================"
```

**关键设计点**：
- 第 1 步 `git stash` 静默执行，解决本地修改阻塞 pull 的问题
- 第 2 步检查 `.env.production.active` 是否已填入真实密钥（不包含 `<` 占位符），避免空密钥启动后端
- 第 5 步先 `pm2 delete` 再 `pm2 start`，确保使用最新配置
- 第 7 步输出三种验证结果，一眼看出问题

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 是否保留 `setup-nginx-ip.sh` | 保留，被 `setup-phase5.sh` 调用 | 单一职责，`setup-nginx-ip.sh` 可独立用于其他场景 |
| PM2 启动方式 | `delete + start` 而非 `reload` | `reload` 要求应用已注册且配置匹配，`delete + start` 更鲁棒 |
| 环境变量检查 | 检查占位符 `<` | 之前 `.env.production.example` 模板中有 `<` 占位符，用户忘记替换会导致密钥无效 |
| Nginx `server_name` | 填 IP 而非 `_` | IP 值明确，curl 和浏览器都能正确路由 |

---

## Verification Steps

### 本地验证（脚本语法）

```bash
bash -n scripts/setup-phase5.sh
```
预期：无输出

### 服务器验证

1. SSH 登录后执行：
   ```bash
   cd /var/www/interview-handbook
   git pull origin reborn      # 先拉到新脚本
   bash scripts/setup-phase5.sh 8.138.219.100
   ```

2. 浏览器打开 `http://8.138.219.100/` → 看到登录页

3. 确认 SSE 流式输出：
   ```bash
   curl -N http://8.138.219.100/api/ai/chat/stream \
     -H "Content-Type: application/json" \
     -d '{"question":"hello"}'
   ```

4. 检查 PM2 开机自启：
   ```bash
   pm2 startup systemd
   pm2 save
   ```
