# 根本原因分析与修复计划：AI 出题 400

## 摘要

浏览器点击"AI出题"按钮返回 400（Bad Request），原因已锁定为 **部署的分支错误导致前端运行的是旧版代码**。本计划包含修复方案、防御性增强和验证步骤。

---

## 一、当前状态分析

### 1.1 已确认的事实

| 检查项 | 结果 | 来源 |
|--------|------|------|
| 前端源码 `useAiChat.js` 中 `generateQuestions` | ✅ 正确发送 `{category, difficulty}` 对象 | 源码 L123-128 |
| SSE 封装 `sse.js` 中 `createSSE` | ✅ 正确执行 `JSON.stringify(body)` | 源码 L36-44 |
| 手动 fetch 到 `/api/debug/echo-body` | ✅ 返回 `bodyType: "object"`，bodyKeys 正确 | 用户日志 |
| Service Worker 干扰 | ❌ undefined（无 SW 干扰） | 用户日志 |
| `express.json()` 返回的 400 错误内容 | ❌ `"请生成一道Java方向的medium难度面试题"`（纯文本，非 JSON） | PM2 日志 |
| `deploy.sh` 的 git pull 分支 | ❌ `git pull origin main` | `deploy.sh` L12 |
| 其他所有脚本使用的分支 | ✅ `reborn` | `server-setup.sh`, `server-diagnose.sh` 等 |
| Nginx `proxy_request_buffering off` | ❌ 仍存在于配置中 | `nginx/interview-handbook.conf` L37 |

### 1.2 根本原因

**`deploy.sh` 从 `main` 分支拉代码，但最新的修复（包含正确的前端参数发送逻辑）在 `reborn` 分支。**

因此：
- 服务器上的 `frontend/dist/` 是 `main` 分支构建的旧版本
- 旧版本的前端代码发送的是**纯文本字符串**（如 `"请生成一道Java方向的medium难度面试题"`）作为 POST body
- 后端 `express.json()` 尝试解析这个纯文本为 JSON，失败，返回 400
- 新加的 `validateBody` 中间件在 `express.json()` 之后，**永远不会被触发**（因为 express.json() 的 400 在中间件链最前面就返回了）

这就是为什么：
- 手动 `fetch` 到 `/api/debug/echo-body` 能正常工作（手动请求发的是正确 JSON）
- 浏览器按钮点击返回 400（浏览器运行的是旧 dist 代码）
- `pm2 logs | grep validateBody` 没有输出（validateBody 根本没被执行）

### 1.3 次要问题

- `nginx/interview-handbook.conf` 仍包含 `proxy_request_buffering off`，虽然此前已修复过一次（`sed` 删除），但部署脚本推上来的配置又恢复了
- `deploy.sh` 与所有其他脚本的分支不一致，未来会导致更多部署问题

---

## 二、修复计划

### Step 1：修复 `deploy.sh` 分支错误

**文件**: `deploy.sh` (L12)

**操作**: 将 `git pull origin main` 改为 `git pull origin reborn`

```bash
# 修改前
git pull origin main

# 修改后
git pull origin reborn
```

**为什么**: deploy.sh 是生产部署脚本，必须与其他所有脚本保持一致，从 reborn 分支获取包含修复的代码。

### Step 2：修复 Nginx 配置中残留的 `proxy_request_buffering off`

**文件**: `nginx/interview-handbook.conf` (L37)

**操作**: 删除 `proxy_request_buffering off;` 行（之前已在服务器上通过 `sed` 删除过，但配置文件本身未更新）

**为什么**: 该指令会导致 POST body 在 `request_buffering` 关闭时，body 可能未完整到达就被转发，导致 `express.json()` 无法解析。删除该行后，Nginx 会缓冲完整 POST body 再转发，body-parser 能正确解析。

### Step 3：添加 Raw Body 捕获中间件（防御性增强）

**新增文件**: `backend/middleware/captureRawBody.js`

**操作**: 创建一个中间件，在 `express.json()` 之前注册。对 `/api/ai/generate/stream` 的 POST 请求：
1. 收集原始请求 body chunks
2. 拼成完整的 raw body 字符串
3. 挂载到 `req._rawBody` 上
4. 调用 `next()`

然后修改 `express.json()` 行为，让它对 JSON parse 错误进行自定义处理，记录原始 body 内容。

**实现方案**: 创建一个自定义 JSON body parser 替代 `express.json()`，对指定路径进行增强：

```js
// backend/middleware/captureRawBody.js
// 功能: 在 express.json() 之前捕获原始 body，JSON parse 失败时记录原始内容
// 数据流: Nginx → captureRawBody → express.json → route
const express = require('express')

function captureRawBody(req, res, next) {
  if (req.method !== 'POST') return next()
  
  let data = ''
  req.on('data', chunk => { data += chunk })
  req.on('end', () => {
    req._rawBody = data
    next()
  })
}

module.exports = captureRawBody
```

然后在 `app.js` 中，在 `express.json()` 之前注册此中间件，并添加自定义 error handler：

```js
// app.js 修改
app.use(cors())
app.use(require('./middleware/captureRawBody'))  // ★ 新增：捕获原始 body

// ★ 新增：自定义 JSON 解析错误处理
app.use((req, res, next) => {
  if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    try {
      req.body = JSON.parse(req._rawBody || '{}')
    } catch (e) {
      console.error('[bodyParser] JSON parse 错误:', e.message)
      console.error('[bodyParser] 原始 body (前200字符):', (req._rawBody || '').slice(0, 200))
      console.error('[bodyParser] 原始 body 类型:', typeof req._rawBody)
      return res.status(400).json({
        code: -1,
        message: '请求体不是有效的 JSON',
        detail: e.message,
        rawBodyPreview: (req._rawBody || '').slice(0, 200)
      })
    }
  }
  next()
})

// 然后移除或注释掉原来的 app.use(express.json())
// app.use(express.json())  // ← 删除或注释
```

> **注意**: 这样可以确保所有 JSON parse 错误都会记录原始 body 内容，未来再出现类似问题一眼就能看出前端发的是什么。

### Step 4：清理 `validateBody` 中间件的冗余逻辑

**文件**: `backend/middleware/validateBody.js`

**操作**: 无需修改，保持现有逻辑。它仍然是有效的防御（校验缺少必填字段）。由于 Step 3 已经让所有 JSON 都能被正确解析，validateBody 现在能真正起作用了。

### Step 5：统一部署脚本体系

**文件**: `deploy.sh`

**操作**: 除了 Step 1 的 `main` → `reborn` 修复外，确保 `deploy.sh` 与其他部署脚本一致：

```bash
# 在 git pull 前添加 stash 保护
cd "$APP_DIR"
git stash  # 防止本地修改导致 pull 冲突
git pull origin reborn
```

**同时检查**: `server-setup.sh`, `server-diagnose.sh`, `scripts/diagnose.sh` 均使用 `reborn` 分支，确认一致。

### Step 6：部署到服务器并验证

**操作**:
1. 提交上述所有修改到 `reborn` 分支并推送
2. SSH 到服务器执行：
   ```bash
   cd /var/www/interview-handbook
   git stash
   git pull origin reborn
   
   # 重新构建前端
   cd frontend
   npm ci
   npm run build
   
   # 更新 Nginx 配置（去掉 proxy_request_buffering off）
   sudo cp nginx/interview-handbook.conf /etc/nginx/sites-available/interview-handbook
   sudo nginx -t && sudo systemctl restart nginx
   
   # 重启后端
   cd ..
   pm2 reload ecosystem.config.js --env production
   ```
3. 用浏览器点击 AI 出题按钮，确认不再 400
4. 运行 `server-diagnose.sh` 确认全部通过

---

## 三、验证步骤

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 页面强制刷新 (`Ctrl+F5`) | 新版 dist 的 JS 被加载 |
| 2 | 点击 AI 出题按钮 | 不再弹出 400 错误 |
| 3 | 浏览器 DevTools → Network → 查看 `/api/ai/generate/stream` 请求 | Request Payload 显示 `{category: "Java", difficulty: "medium"}` |
| 4 | PM2 查看日志 `pm2 logs --lines 50` | 无 JSON parse 错误，validateBody 通过 |
| 5 | 运行 `bash server-diagnose.sh` | 全部绿色 ✓ |

---

## 四、附加建议

1. **以后部署一律使用 `deploy.sh`**，不要手动 `git pull`，避免再次出现分支不一致
2. **建议在服务器上设置 git hook 或 CI**，防止 `main` 分支被误推到服务器
3. **浏览器无明显缓存提示时**，用 `Ctrl+F5` 而非普通刷新（用户已做过，但仍值得提醒）

---

## 五、决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 是否需要 Nginx `proxy_request_buffering off` | ❌ 删除 | 会导致 POST body 不完整；标准 JSON API 不需要；SSE 只需要 response buffering off |
| `validateBody` 是否保留 | ✅ 保留 | 即使修复了 JSOM 解析，字段校验仍然是必要的防御层 |
| 自定义 JSON 解析 vs 原生 express.json | 自定义 + 错误日志 | 不丢失 JSON parse 失败时的原始 body 内容，便于排查 |
| 部署用 `reborn` vs `main` | `reborn` | 所有工作分支在 reborn，main 没有最新代码 |

---

*计划版本: v1.0 | 生成日期: 2026-06-26*
