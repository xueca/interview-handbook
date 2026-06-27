# Bug 修复计划：AI出题500 + 搜索400

> **日期**: 2026-06-25 | **目标**: 解决服务器上两个API错误

---

## 摘要

服务器部署后出现两个API错误：
1. **Bug 1**: AI非流式出题返回 HTTP 500，`buildGeneratePrompt is not a function`
2. **Bug 2**: 关键词搜索返回 HTTP 400（中文关键词"闭包"）

用户已尝试 `git pull` 但未解决问题，且不清楚手动测试时所需的 token 如何获取。

---

## 当前状态分析

### 本地代码状态（正确）

| 文件 | 关键内容 | 状态 |
|------|---------|------|
| `backend/controllers/aiPrompt.js` | 定义并导出 `buildGeneratePrompt` | 正确 |
| `backend/controllers/aiController.js` | 导入并使用 `buildGeneratePrompt` | 正确 |
| `backend/controllers/questionController.js` | 搜索逻辑简单，不返回400 | 正确 |
| `nginx/interview-handbook.conf` | 代理配置正确 | 正确 |

### 服务器现象（异常）

| Bug | 现象 | 关键线索 |
|-----|------|---------|
| Bug 1 | 非流式出题500，流式出题SSE能收到数据 | 流式可能也失败，只是错误被catch包装成SSE event |
| Bug 2 | 中文搜索400，分类筛选200 | 问题只在中文关键词时出现 |

---

## 根本原因假设

### Bug 1: `buildGeneratePrompt is not a function`

**最可能原因**: `git pull` 只更新了文件系统上的代码，但 **PM2 进程没有重启**，Node.js 内存中缓存的是旧版本的 `aiPrompt.js` 模块。

Node.js 的 `require()` 在进程启动时加载模块并缓存在 `require.cache` 中。`git pull` 更新文件后，如果不重启进程，内存中的旧模块仍然有效。

**为什么流式"能工作"**: 流式接口 `generateStream` 的旧代码可能直接 inline 写了 prompt，不经过 `buildGeneratePrompt`；或者它也报错了，但错误被 catch 块捕获并包装成 SSE event 发给前端，看起来像"收到数据"。

**另一个隐患**: `ecosystem.config.js` 配置了 `wait_ready: true` 和 `listen_timeout: 10000`，但 `app.js` 中没有任何 `process.send('ready')` 调用。这会导致 `pm2 reload` 行为异常。

### Bug 2: 搜索返回 HTTP 400

**最可能原因**: **Nginx 对包含原始 UTF-8 字节（未编码中文）的 HTTP 请求行返回 400 Bad Request**。

HTTP/1.1 协议规定请求行必须是 ASCII 字符。URL 中的非 ASCII 字符（如中文 `闭包`）必须先进行 percent-encoding。如果请求直接发送了原始 UTF-8 字节，Nginx 的 HTTP 解析器会拒绝。

**验证方法**: 通过三组对照实验确认问题来源：
- A: Nginx + 中文未编码 → 预期 400
- B: Nginx + 中文已编码 → 预期 200
- C: 直连后端 + 中文未编码 → 预期 200

---

## 修复方案

### 修复前：诊断检查清单（必须在服务器执行）

```bash
cd /var/www/interview-handbook

echo "=== 1. Git 状态 ==="
git branch --show-current
git log --oneline -1
git status --short

echo "=== 2. 关键函数存在性 ==="
grep -n "function buildGeneratePrompt" backend/controllers/aiPrompt.js
grep -n "module.exports" backend/controllers/aiPrompt.js

echo "=== 3. 文件时间 vs PM2 进程时间 ==="
stat -c %y backend/controllers/aiPrompt.js
pm2 show interview-handbook-api | grep "created at"

echo "=== 4. Nginx 配置检查 ==="
sudo nginx -t
grep -n "charset" /etc/nginx/sites-available/interview-handbook || echo "未配置 charset"
```

### Token 获取方法

测试命令中的 `token` 是 **JWT（JSON Web Token）**，通过注册接口获取：

```bash
# 注册测试用户并获取 token
TOKEN_RESP=$(curl -s -X POST http://8.138.219.100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"diag_'$(date +%s)'","password":"Test1234"}')
echo $TOKEN_RESP
# 从响应中提取 "token":"eyJhbGciOiJIUzI1NiIs..."
```

### Bug 1 修复步骤

**步骤 1**: 强制完全重启 PM2 进程（不要只用 reload）

```bash
cd /var/www/interview-handbook
pm2 delete interview-handbook-api
pm2 start backend/app.js --name interview-handbook-api \
  --env NODE_ENV=production \
  --env PORT=5000 \
  --env JWT_SECRET="你的JWT_SECRET" \
  --env DEEPSEEK_API_KEY="你的API_KEY"
pm2 save
```

**步骤 2**: 修复 `ecosystem.config.js` 的 `wait_ready` 隐患

编辑 `ecosystem.config.js`，删除或注释掉：
```js
// wait_ready: true,
// listen_timeout: 10000,
```

**步骤 3**: 验证修复

```bash
# 获取 token
TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test_'$(date +%s)'","password":"Test1234"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 测试非流式出题
curl -s -X POST http://127.0.0.1:5000/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"category":"JavaScript","difficulty":"easy","count":1}'
# 预期返回: {"code":0,"message":"生成成功",...}
```

### Bug 2 修复步骤

**步骤 1**: 三组对照实验确认问题来源

```bash
# 先获取 token（同上）
TOKEN="你的token"

# 实验A: Nginx + 中文未编码
curl -s -w "\nHTTP:%{http_code}" "http://8.138.219.100/api/questions?keyword=闭包" \
  -H "Authorization: Bearer $TOKEN"

# 实验B: Nginx + 中文已编码
curl -s -w "\nHTTP:%{http_code}" "http://8.138.219.100/api/questions?keyword=%E9%97%AD%E5%8C%85" \
  -H "Authorization: Bearer $TOKEN"

# 实验C: 直连后端 + 中文未编码
curl -s -w "\nHTTP:%{http_code}" "http://127.0.0.1:5000/api/questions?keyword=闭包" \
  -H "Authorization: Bearer $TOKEN"
```

**步骤 2**: 根据实验结果修复

| 实验结果 | 结论 | 修复方案 |
|---------|------|---------|
| A=400, B=200, C=200 | Nginx 拒绝未编码中文 | 方案A: 测试脚本改用 URL 编码 |
| A=400, B=400, C=200 | Nginx 配置问题 | 方案B: Nginx 添加 `charset utf-8` |
| A=400, C=400 | 后端问题 | 检查后端 query parser |

**方案A（测试脚本修复）**:
编辑 `server-test-4.5.sh`，将中文关键词替换为 URL 编码：
```bash
# 修改前
"${API_URL}/questions?keyword=闭包"
# 修改后
"${API_URL}/questions?keyword=%E9%97%AD%E5%8C%85"
```

**方案B（Nginx 配置修复）**:
编辑 `/etc/nginx/sites-available/interview-handbook`，在 server 块中添加：
```nginx
charset utf-8;
source_charset utf-8;
```
然后 `sudo nginx -t && sudo systemctl restart nginx`

---

## 决策与假设

1. **假设**: 服务器上的 `backend/controllers/aiPrompt.js` 文件内容正确（因为 `git pull` 已执行），但 PM2 进程未重启导致内存中运行旧代码。
2. **假设**: Bug 2 是 Nginx 对未编码中文 URL 的严格处理，而非后端代码问题。
3. **决策**: 优先修复 Bug 1（重启 PM2），因为它影响核心功能；Bug 2 可以通过测试脚本改用 URL 编码快速绕过。

---

## 验证步骤

修复后执行以下验证：

```bash
cd /var/www/interview-handbook
bash server-test-4.5.sh 8.138.219.100
```

预期结果：
- 题库列表: HTTP 200 ✓
- 分类筛选: HTTP 200 ✓
- **关键词搜索: HTTP 200 ✓**
- AI 非流式出题: HTTP 200, code=0 ✓
- AI 流式出题 SSE: 收到流式数据 ✓
