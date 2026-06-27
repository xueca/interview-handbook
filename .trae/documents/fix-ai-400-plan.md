# AI 出题 400 诊断与修复计划

> 现象: 浏览器点击"快捷出题" → POST /api/ai/generate/stream → 400 Bad Request
> curl 直接请求后端/Nginx 均正常 200

## 一、根因分析

后端错误日志:
```
SyntaxError: Unexpected token '"', ""请生成一道Java方向的medium难度面试题"... is not valid JSON
```

请求体是 `"请生成一道Java方向的medium难度面试题"`（字符串），而不是 `{"category":"JavaScript","difficulty":"medium"}`（JSON 对象）。

**当前代码是正确的：** `useAiChat.js` 第 127-128 行把 `params` 对象传给 `callSSE`，`createSSE` 用 `JSON.stringify(params)` 发送。但浏览器可能加载了**旧版本的 dist JS 文件**（旧版传的是 prompt 字符串）。

## 二、诊断步骤（做一验证一）

### Step 1: 创建 debug echo 端点

**文件**: `backend/routes/debug.js`（新建）
- 接收 POST /api/debug/echo-body
- 打印 `req.body` 的 typeof、Object.keys、JSON 内容到 PM2 日志
- 原样返回给前端

**文件**: `backend/app.js`（修改）
- 在 `app.use(express.json())` 后注册 `/api/debug` 路由

**验证**: 刷新浏览器 → DevTools Console 执行:

```js
fetch('/api/debug/echo-body', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
  body: JSON.stringify({ category: 'Java', difficulty: 'medium' })
}).then(r => r.json()).then(console.log)
```

→ 看后端 PM2 日志输出 `[body] typeof` 和 `[body] raw` 的值

### Step 2: 检查 dist 中是否包含了新版代码

```bash
grep -n "传递 params 对象" /var/www/interview-handbook/frontend/dist/assets/*.js
```

如果找到 → 新构建正确。如果没找到 → 可能未正确拉取最新源码。

### Step 3: 关闭 index.html 浏览器缓存

**文件**: `nginx/interview-handbook.conf`（修改）
- 在静态资源缓存规则之前添加 `location = /index.html { ... no-cache ... }`

**服务器上执行**: `npm run build` → `sudo systemctl restart nginx`

### Step 4: 清除浏览器 Service Worker

DevTools Console 执行:
```js
navigator.serviceWorker?.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
```

### Step 5: 验证

Ctrl+F5 强制刷新 → 点击"快捷出题" → 看是否 200

## 三、防御性修复

在修复后补充：

### File 3: `backend/middleware/validateBody.js`（新建）
当 `req.body` 不是对象（例如是字符串）时，返回清晰的 400 错误 + 说明 `receivedType`，避免模糊的 JSON parse error。

### File 4: `backend/routes/ai.js`（修改）
为 `/generate/stream` 路由添加 `validateBody('category', 'difficulty')`。

### File 5: `backend/controllers/aiController.js`（修改）
`generateStream` 的 catch 中添加 `JSON.stringify(req.body).slice(0, 200)` 日志，方便下次定位。

## 四、修改文件清单

| 文件 | 操作 | 优先级 |
|------|------|--------|
| `backend/routes/debug.js` | 新建 | P0 诊断 |
| `backend/app.js` | 修改（添加路由注册） | P0 诊断 |
| `nginx/interview-handbook.conf` | 修改（index.html 禁止缓存） | P0 修复 |
| `backend/middleware/validateBody.js` | 新建 | P1 防御 |
| `backend/routes/ai.js` | 修改（添加 validateBody） | P1 防御 |
| `backend/controllers/aiController.js` | 修改（增强 catch 日志） | P1 防御 |

## 五、验证标准

1. ✅ Debug echo: 能正常返回 echo 数据
2. ✅ 浏览器触发"快捷出题" → 200 OK
3. ✅ 页面正常显示 AI 生成的题目
4. ✅ 如果仍 400，echo 端点的日志能明确显示 body 到底是什么
