# Phase 5 自动化脚本 + 域名配置计划

## Summary

用户服务器 IP `8.138.219.100`（阿里云），**尚无域名**。需要解决两个问题：
1. **域名 → HTTPS**：无域名则无法使用 Certbot/Let's Encrypt，目前可用 IP + HTTP 直接上线
2. **Nginx 配置激活脚本**：将仓库中的 `nginx/interview-handbook.conf`（占位符 `your-domain.com`）适配为实际 IP 地址，并自动部署到服务器

---

## Current State Analysis

### 用户回答澄清

| 问题 | 回答 |
|------|------|
| 是否已有域名 | ❌ 无，且不知需要购买 |
| 域名用途 | 主域名（如 xxx.com） |
| 公网 IP | `8.138.219.100`（阿里云 ECS，IP 段 `8.138.x.x` 属于阿里云） |

### 域名必要性评估

| 需求 | 是否必须域名 | 替代方案 |
|------|------------|---------|
| 浏览器访问站点 | ❌ 不必须 | IP + HTTP 即可访问 |
| SSE 流式输出 | ❌ 不必须 | `proxy_buffering off` 与域名无关 |
| HTTPS | ✅ 必须域名 | Let's Encrypt 需要域名验证 |
| 面试官 Demo 体验 | ❌ 不必须 | HTTP + IP 足够演示功能 |

**结论**：域名不是上线阻塞项。直接用 IP + HTTP 可以上线给面试官看。域名购买和 HTTPS 可以后续再升级。

### 当前 Nginx 配置问题

`nginx/interview-handbook.conf` 中 `server_name your-domain.com www.your-domain.com` 是占位符，直接部署到服务器后 Nginx 不会代理到该虚拟主机。

---

## Proposed Changes

### 改动 1：创建 `scripts/setup-nginx-ip.sh` — 基于 IP 的 Nginx 一键部署脚本

**What**：在 `scripts/` 目录下创建自动化脚本，执行以下操作：
1. 读取 `nginx/interview-handbook.conf` 模板
2. 将 `server_name your-domain.com www.your-domain.com` 替换为 `server_name 8.138.219.100`（用户 IP）
3. 复制到 `/etc/nginx/sites-available/interview-handbook`
4. 启用站点（创建软链接）
5. 删除 default 站点（避免冲突）
6. 测试 Nginx 配置语法
7. 重启 Nginx
8. 输出验证命令

**Why**：用户购买服务器后需要一键配置 Nginx，不需要手动编辑 `/etc/nginx/sites-available/`。

**How**：

```bash
#!/bin/bash
# 文件功能: 基于公网 IP 自动部署 Nginx 配置 | 用法: bash scripts/setup-nginx-ip.sh <IP>

set -e

IP="${1:-8.138.219.100}"

# 1. 读取模板并替换占位符
sed "s/server_name your-domain.com www.your-domain.com;/server_name $IP;/g" \
  nginx/interview-handbook.conf > /tmp/interview-handbook.conf

# 2. 复制到 Nginx 配置目录
sudo cp /tmp/interview-handbook.conf /etc/nginx/sites-available/interview-handbook

# 3. 启用站点
sudo ln -sf /etc/nginx/sites-available/interview-handbook /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 4. 验证并重启
sudo nginx -t
sudo systemctl restart nginx

# 5. 验证结果
echo "===== Nginx 配置完成 ====="
echo "公网地址: http://$IP"
echo "后端验证: curl http://127.0.0.1:5000/"
echo "前端验证: curl http://$IP/ | head -c 200"
```

---

### 改动 2：创建 `scripts/setup-https.sh` — 域名 HTTPS 一键配置脚本（备用，待用户购买域名后使用）

**What**：自动化域名 → Certbot HTTPS 流程的辅助脚本，含：
1. 检查域名 DNS 解析是否生效
2. 替换 Nginx `server_name` 为域名
3. 运行 Certbot
4. 验证自动续期

**Why**：用户未来购买域名后可零门槛上线 HTTPS。

**How**：

```bash
#!/bin/bash
# 文件功能: 域名 HTTPS 一键配置 | 用法: bash scripts/setup-https.sh <domain>
# 前置条件: 域名已购买，DNS A 记录已指向服务器 IP

set -e

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
  echo "用法: bash scripts/setup-https.sh your-domain.com"
  exit 1
fi

# 1. 验证 DNS 解析
echo "==> 验证 DNS 解析..."
IP=$(curl -s ifconfig.me)
RESOLVED_IP=$(dig +short "$DOMAIN" | head -1)
if [ "$RESOLVED_IP" != "$IP" ]; then
  echo "⚠️  域名 $DOMAIN 解析到 $RESOLVED_IP，但本机公网 IP 是 $IP"
  echo "   请在阿里云 DNS 控制台添加 A 记录指向 $IP"
  echo "   设置后 DNS 生效需要 1-10 分钟"
  exit 1
fi
echo "✅ DNS 解析正确"

# 2. 修改 Nginx server_name
echo "==> 配置 Nginx server_name..."
sudo sed -i "s/server_name [^;]*;/server_name $DOMAIN www.$DOMAIN;/g" \
  /etc/nginx/sites-available/interview-handbook
sudo nginx -t
sudo systemctl reload nginx

# 3. 运行 Certbot
echo "==> 申请 HTTPS 证书..."
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN"

# 4. 验证自动续期
echo "==> 验证自动续期..."
sudo certbot renew --dry-run

echo "===== HTTPS 配置完成 ====="
echo "访问地址: https://$DOMAIN"
```

---

### 改动 3：更新 `README.md` 中 Nginx 配置说明

**What**：在 README 中增加一行：若只用 IP，运行 `bash scripts/setup-nginx-ip.sh`。若用域名，先买域名配置 DNS 后运行 `bash scripts/setup-https.sh your-domain.com`。

**Why**：README 是用户部署时的第一参考资料，需要包含自动化步骤入口。

**How**：在 README 的 Nginx 配置章节末尾追加脚本用法说明。

---

### 改动 4：无需改动项（已就绪）

以下文件**不需要改动**，已可以直接使用：
- `nginx/interview-handbook.conf` — 模板内容正确，只需 `sed` 替换 server_name
- `deploy.sh` — 部署逻辑不涉及域名/IP，无需修改
- `ecosystem.config.js` — 不涉及网络地址，无需修改

---

## 域名购买指导（不作为脚本内容，仅作告知用户）

如果用户后续想买域名，推荐路径：

| 步骤 | 操作 | 费用 | 地址 |
|------|------|------|------|
| 1 | 在阿里云万网搜索可用域名 | 约 10-50 元/年 | https://wanwang.aliyun.com/ |
| 2 | 购买 .top / .xyz / .fun 等便宜后缀 | 约 10-30 元/年 | 万网搜索后加入购物车 |
| 3 | 进入阿里云 DNS 控制台 → 添加 A 记录 | 免费 | https://dns.console.aliyun.com/ |
| 4 | 记录类型 `A`，主机记录 `@`（和 `www`），记录值 `8.138.219.100` | 免费 | 等待 DNS 生效（1-10 分钟） |

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 域名是否必须 | ❌ 非必须 | HTTP + IP 可正常访问，面试官 Demo 足够 |
| 脚本位置 | `scripts/` 目录 | 与 `backend/scripts/` 统一，便于管理 |
| 脚本语言 | Bash | Nginx/Certbot 操作均需 shell，无需 Python 引入额外依赖 |
| HTTPS 脚本 | 单独文件，不合并 | 域名购买+DNS 配置需用户手动完成，脚本只能做服务器端操作 |
| Nginx 模板 | 不修改 `nginx/interview-handbook.conf` | 模板保留域名占位符，通过 sed 替换适配不同场景 |

---

## Verification Steps

### 脚本 `setup-nginx-ip.sh` 验证

1. 在本地（模拟）确认 sed 替换结果正确：
   ```bash
   sed "s/server_name your-domain.com www.your-domain.com;/server_name 8.138.219.100;/g" nginx/interview-handbook.conf
   ```
   预期输出中 `server_name` 行显示 `server_name 8.138.219.100;`

2. 脚本语法检查：
   ```bash
   bash -n scripts/setup-nginx-ip.sh
   ```
   预期：无输出（语法正确）

3. 服务器部署后验证：
   ```bash
   curl http://8.138.219.100/
   ```
   预期：返回 `frontend/dist/index.html` 内容

### 脚本 `setup-https.sh` 验证（购买域名后）

1. DNS 验证：
   ```bash
   dig +short your-domain.com
   ```
   预期：输出 `8.138.219.100`

2. HTTPS 验证：
   ```bash
   curl -I https://your-domain.com/
   ```
   预期：返回 HTTP 200，HTTP 头包含 `strict-transport-security`
