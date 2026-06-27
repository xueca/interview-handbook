# 恢复 AI 出题正常工作的版本

## 摘要

经过全面搜索 git 历史（所有提交、dangling blob、reflog、stash），结论如下：

- **`reborn` 分支上没有一个提交的 AI 出题是完全正常的** — 所有提交都发送 `prompt`（字符串）
- **`a94724a`（项目week3-day17）** 是最接近正常的版本：前端把 prompt 包装为 `{topic: prompt}` 再发送，body 是合法 JSON 对象，body-parser 不会拒绝
- **`c85a3d5`（AI出题格式优化）** 在 `main` 分支上，用 EventSource + GET，完全绕过 body-parser，是确认能工作的版本
- **修复代码（发送 `params` 对象）从未被提交到 git** — 只存在于本地工作副本中

## 一、调查过程与发现

### 1.1 搜索范围

| 搜索位置 | 结果 |
|---------|------|
| `reborn` 分支所有提交的 `useAiChat.js` | 全部发送 `prompt`（字符串），无 `params` |
| `git stash list` | 空，无 stash |
| `git fsck --lost-found` | 仅有 dangling blob，无 dangling commit |
| 搜索所有 dangling blob 中含 `callSSE('generate', params` 的 | 无匹配 |
| `git reflog -30` | 无异常操作记录 |

### 1.2 各版本 AI 出题链路对比

| 提交 | 前端发送内容 | body-parser 结果 | AI出题 |
|------|-------------|-----------------|--------|
| `c85a3d5` (main) | EventSource + GET + URL参数 | 不涉及（无POST body） | ✅ 确认工作 |
| `a94724a` (reborn) | `JSON.stringify({topic: prompt})` = `{"topic":"请生成..."}` | ✅ 合法JSON对象 | ✅ 应该工作 |
| `9a60e2d` → HEAD (reborn) | `JSON.stringify(prompt)` = `"请生成..."` (裸字符串) | ❌ strict模式拒绝 | ❌ 400 |
| 本地工作副本(未提交) | `JSON.stringify({category,difficulty})` = `{"category":"Java",...}` | ✅ 合法JSON对象 | ✅ 已修复 |

### 1.3 `a94724a` 版本全链路验证

**前端链路**:
- `useAiChat.js`: `callSSE('generate', prompt, onComplete)` → `generateStream(prompt, ...)`
- `ai.js`: `generateStream(topic, ...)` → `createSSE(url, {topic}, ...)` → **包装为 `{topic: prompt}`**
- `sse.js`: `body: JSON.stringify({topic: "请生成一道Java..."})` → 发送 `{"topic":"请生成..."}` (合法JSON对象) ✅
- `sse.js`: 有 `Authorization: Bearer ${token}` header ✅
- `App.vue`: 模板标签平衡（3开3闭）✅ → **可以构建**

**后端链路**:
- `app.js`: `require('dotenv').config()` + `express.json()` (标准)
- `routes/ai.js`: `router.post('/generate/stream', auth, generateStream)` (有 auth)
- `aiController.js`: `const { topic } = req.body` → 从 body 读取 topic ✅
- `aiController.js`: 用原生 `https.request` 调用 DeepSeek
- `aiPrompt.js`: 存在 ✅

**结论**: `a94724a` 的 AI 出题链路完整，应该能正常工作。

### 1.4 `a94724a` 的已知局限

| 局限 | 影响 | 解决方案 |
|------|------|---------|
| `app.js` 用 `require('dotenv').config()` (加载 .env 非 .env.production.active) | PM2 生产环境 JWT_SECRET 加载失败 | cherry-pick `6292265` 的 env 修复 |
| 原生 `https.request` 无超时控制 | 非流式出题可能超时挂起 | 可接受，后续优化 |
| 无部署脚本 | 手动部署 | cherry-pick 后续的 deploy.sh 等 |
| 无 Nginx 配置 | 需手动配置 | cherry-pick nginx conf |
| `sse.js` 不处理 `[DONE]` 标记 | 流结束后前端可能不触发 done 回调 | 可接受，不影响出题本身 |

## 二、恢复方案

### 方案：基于 `a94724a` 创建稳定分支 + cherry-pick 关键修复

#### Step 1: 从 `a94724a` 创建新分支 `reborn-stable`

```bash
git checkout -b reborn-stable a94724a
```

#### Step 2: Cherry-pick 后续关键修复（不引入破坏性变更）

需要 cherry-pick 的提交（按顺序）:

| 提交 | 说明 | 重要性 |
|------|------|--------|
| `6292265` | fix(deploy): load .env.production.active | **必须** — 否则 PM2 崩溃 |
| `cac1ec2` | chore(deploy): add production deployment configs | **必须** — 部署配置 |
| `9a4dc0e` | chore(deploy): enforce LF line endings | 建议 — 防止 CRLF 问题 |
| `5115c04` | feat(deploy): add server-setup.sh | 建议 — 服务器初始化 |
| `f0b48d4` | fix: 非流式出题超时从10s改为30s | 建议 — 超时修复 |
| `51dd249` | fix: 补充 aiPrompt.js 导出 | **必须** — 后端依赖 |
| `34410f1` | fix: QuestionBank.vue 和 NotFound.vue 标签修复 | 建议 — 前端构建 |

**注意**: 不 cherry-pick `9a60e2d` 及之后的提交（这些引入了 `params` 直接传递但 `useAiChat.js` 未同步修改，导致 400）

#### Step 3: 验证关键文件状态

Cherry-pick 后确认:
- `useAiChat.js`: `callSSE('generate', prompt, onComplete)` — 发送 prompt 字符串
- `ai.js`: `generateStream(topic, ...)` → `createSSE(url, {topic}, ...)` — 包装为 `{topic}` 对象
- `sse.js`: 原始版本，`createSSE` 返回 `{ close: () => controller.abort() }`
- `aiController.js`: `const { topic } = req.body` — 从 body 读 topic
- `app.js`: 加载 `.env.production.active` (cherry-pick `6292265` 后)

#### Step 4: 服务器部署

```bash
# 服务器上切换到稳定分支
cd /var/www/interview-handbook
git fetch origin
git checkout reborn-stable
git pull origin reborn-stable

# 构建前端
cd frontend
npm ci
npm run build

# 配置 Nginx
cd ..
sudo cp nginx/interview-handbook.conf /etc/nginx/sites-available/interview-handbook
sudo nginx -t && sudo systemctl restart nginx

# 启动后端
pm2 reload ecosystem.config.js --env production
```

#### Step 5: 验证

1. 浏览器 `Ctrl+F5` 刷新
2. 登录后点击 AI 出题
3. 确认不再 400，题目正常生成
4. 运行 `bash server-diagnose.sh`

## 三、风险评估

### 低风险（`a94724a` 已验证）
- AI 出题链路完整，body 是合法 JSON 对象
- App.vue 模板标签平衡，可以构建
- 后端有 auth 保护

### 中风险（cherry-pick 可能有冲突）
- `6292265` 修改 `app.js` 的 env 加载 — 可能与 `a94724a` 的 `app.js` 有冲突
- `51dd249` 修改 `aiPrompt.js` — 应该无冲突
- 如果 cherry-pick 冲突，手动解决，保留 `a94724a` 的 AI 逻辑 + 引入的修复

### 降级方案
如果 cherry-pick 后仍有问题:
- 直接用 `a94724a` 原始版本（不 cherry-pick）
- 在服务器上手动设置环境变量（`export JWT_SECRET=xxx`）
- 手动部署，不依赖脚本

## 四、与之前方案的区别

| 对比项 | 方案A（失败） | 本方案 |
|--------|-------------|--------|
| 基础版本 | HEAD (b0512d1) | a94724a (已验证) |
| useAiChat.js | 发送 prompt → 改为 params | 发送 prompt → 包装为 {topic} |
| 前端构建 | App.vue 有模板问题 | App.vue 模板平衡 ✅ |
| 后端 | 期望 {category,difficulty} | 期望 {topic} — 与前端匹配 ✅ |
| 风险 | 高（多个未验证的修改） | 低（回到已知状态） |

## 五、后续改进路径

确认 `reborn-stable` 工作后，可以逐步引入改进:
1. 修改 `useAiChat.js` 发送 `{category, difficulty}` 对象（而非 prompt 字符串）
2. 修改 `ai.js` 的 `generateStream` 直接传 params（不再包装为 {topic}）
3. 修改 `aiController.js` 从 `req.body` 读取 `category/difficulty`
4. 每步都验证 AI 出题正常后再进行下一步

---

*计划版本: v1.0 | 生成日期: 2026-06-26*
