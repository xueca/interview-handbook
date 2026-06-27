# Bug 修复计划 v2：AI出题500 + 搜索中文400

> **日期**: 2026-06-25 | **目标**: 解决服务器 (8.138.219.100) 上两个API错误
> **核心原则**: 先诊断，再修复；不做假设；不创建多余的中间文件

---

## 上一版计划为什么失败？

| 步 | 我让你做的 | 服务器实际情况 | 结果 |
|---|-----------|---------------|------|
| 1 | 创建 `backend/.env.production.active` | 服务器上**没有**这个文件 | ❌ grep 不到任何值 |
| 2 | grep 这个文件的 JWT_SECRET | 文件不存在 → 空值 | ❌ JWT_SECRET="" |
| 3 | `pm2 start --env JWT_SECRET=""` | auth.js 检测到空值 → `process.exit(1)` | ❌ 进程直接崩溃 |
| 4 | 测试 API | 进程根本没跑起来 | ❌ 所有测试都失败 |

**根因**: 我**假设**了服务器上有 `.env.production.active` 文件，但实际上不存在。这个假设错了，后续全部崩塌。

---

## 这次的核心思路

1. **先看不假设**——登录服务器先看清楚实际有什么文件、什么内容
2. **利用已有的**——服务器已经有 `.env.production` 和 `ecosystem.config.js`，不创建新文件
3. **验一步走一步**——每做完一步都确认，不跳步

---

## 第一阶段：诊断（6步顺序执行）

### D1 登录服务器

```bash
ssh deploy@8.138.219.100
```

### D2 检查 PM2 进程状态

```bash
cd /var/www/interview-handbook
pm2 status
```

**看什么**: `interview-handbook-api` 是 online / errored / 不存在？

### D3 检查 ecosystem.config.js 的内容

```bash
cat /var/www/interview-handbook/ecosystem.config.js
```

**看什么**:
- `env_file` 指向哪个路径？（`backend/.env.production` 还是别的？）
- 有没有内联的 `JWT_SECRET` 和 `DEEPSEEK_API_KEY`？

### D4 检查服务器上实际存在的 .env 文件

```bash
ls -la /var/www/interview-handbook/backend/.env*
cat /var/www/interview-handbook/backend/.env.production
```

**看什么**:
- `.env.production` 存在吗？内容完整吗？
- JWT_SECRET、DEEPSEEK_API_KEY 都有值吗？

### D5 看 PM2 日志找错误线索

```bash
pm2 logs interview-handbook-api --lines 30
```

**找什么**:
- `FATAL: JWT_SECRET is not set` → 环境变量没加载
- `buildGeneratePrompt is not a function` → PM2 缓存旧代码
- `Error: DeepSeek API Key 未配置` → API Key 缺失

### D6 确认代码完整性

```bash
# 确认 aiPrompt.js 导出了 buildGeneratePrompt
grep -n "buildGeneratePrompt" backend/controllers/aiPrompt.js

# 确认 aiController.js 正确导入
grep -n "buildGeneratePrompt" backend/controllers/aiController.js
```

### D7 检查 git 状态（新增！）

```bash
# 当前在哪个分支？提交到哪个版本了？
git branch --show-current
git log --oneline -3

# 有没有本地修改被 git 保护了？
git status --short

# 与远程的最新差异
git fetch origin
git log --oneline HEAD..origin/reborn
```

---

## 第二阶段：修复（根据诊断结果选路径走）

### 路径 A：git 没有完全更新（最新发现！最可能的原因）

**触发条件**: D6 发现 `aiPrompt.js` 没有 `buildGeneratePrompt`，但 `aiController.js` 有引用

**原因**: `git pull` 只部分成功。部分文件被 git 保护（本地有修改），git pull 跳过了它们。

**修复**:

```bash
cd /var/www/interview-handbook

# 1. 看看有什么本地修改
git status --short

# 2. 如果只有 ecosystem.config.js 被修改过（这是正常的，服务器版本有内联 JWT_SECRET）
#    先备份它
cp ecosystem.config.js ecosystem.config.js.bak

# 3. 强制与远程对齐（放弃所有本地修改）
git fetch origin
git reset --hard origin/reborn

# 4. 恢复 ecosystem.config.js（因为之前解释了，不要在 git 里放敏感信息）
#    但如果服务器版本有内联 JWT_SECRET，就保留它的版本
#    检查备份中有没有 JWT_SECRET 内联
grep JWT_SECRET ecosystem.config.js.bak && cp ecosystem.config.js.bak ecosystem.config.js

# 5. 确认文件更新成功
grep -n "buildGeneratePrompt" backend/controllers/aiPrompt.js
# 预期输出: 21:function buildGeneratePrompt({ category, difficulty, count }) {
#          48:module.exports = { ..., buildGeneratePrompt, ... }
```

### 路径 B：环境变量问题

**触发条件**: D5 日志显示 `FATAL: JWT_SECRET is not set`

**问题**: `ecosystem.config.js` 里 `env_file` 指向的文件不存在或内容为空

**修复**: 检查 .env.production 存在且有内容即可，因为 app.js 第1行 `require('dotenv').config()` 会加载它。

但要注意：`dotenv.config()` 默认只加载 `.env` 文件！如果服务器上只有 `.env.production` 没有 `.env`，PM2 需要从 `ecosystem.config.js` 的 `env` 或 `env_file` 注入变量。

**关键事实**: 从用户执行日志可以看到进程是 running 的（`Example app listening on port 5000`），说明 `JWT_SECRET` 已经从某个途径加载成功了。路径 A（git 部分更新）才是根源。

### 路径 C：PM2 重启

**触发条件**: 路径 A 修完后，进程已在跑但可能跑的是旧代码

```bash
cd /var/www/interview-handbook
pm2 delete interview-handbook-api    # 完全清缓存
pm2 start ecosystem.config.js         # 不要用 --env production（ecosystem.config.js 没有 env_production 块）
pm2 save
```

### 路径 D：中文搜索 400

**触发条件**: 公网访问 `?keyword=闭包` 返回 400，但 `?keyword=%E9%97%AD%E5%8C%85` 正常

**原因**: Nginx 严格遵循 HTTP/1.1 规范，拒绝包含 UTF-8 字节的请求行

**修复方案**:

**方案D1（推荐，已验证）**: 测试脚本已经改好了（`server-test-4.5.sh` 第191行用 `%E9%97%AD%E5%8C%85`）。前端 Vue 用 axios 发请求时会自动编码中文。

**方案D2（可选）**: Nginx 加 charset 配置（只影响响应头，不一定有用）。

---

## 第三阶段：验证（4步确认）

### V1 确认文件更新成功

```bash
grep -n "buildGeneratePrompt" backend/controllers/aiPrompt.js
# 预期: 21:function buildGeneratePrompt...
#       48:module.exports = { ..., buildGeneratePrompt, ... }
```

### V2 确认进程跑起来了

```bash
pm2 status | grep interview-handbook-api
# 预期: online（绿色）
```

### V3 测试 AI 出题

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testai_'$(date +%s)'","password":"Test1234"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s -m 30 -X POST http://127.0.0.1:5000/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"category":"JavaScript","difficulty":"easy","count":1}'
# 预期: {"code":0,"message":"生成成功","data":[...]}
```

### V4 跑完整测试脚本

```bash
cd /var/www/interview-handbook
bash server-test-4.5.sh 8.138.219.100
# 预期: FAIL=0，所有测试通过
```

---

## 和上一版计划的关键区别

| 维度 | 上一版（失败） | 本版 |
|------|--------------|------|
| 假设 | 假设有 `.env.production.active` | **先诊断再看**，不假设 |
| Bug 1 根因假设 | 假设是 PM2 缓存问题 | **最新发现：git pull 部分更新失败**（aiPrompt.js 没更新） |
| 修复策略 | 创建 `.env.production.active` + 重启 PM2 | **先用 git reset 强制对齐远程**，再重启 PM2 |
| 启动方式 | `pm2 start backend/app.js --env JWT_SECRET=xxx`（手动传参，容易漏） | `pm2 start ecosystem.config.js`（不要 `--env production`） |
| 新增诊断 | 无 | **D7: git status + git fetch + git log** 检查分支状态 |

---

## 从用户执行日志中确认的关键事实

从你上传的执行记录中，我已经看到了：

1. ✅ **`.env.production.active` 不存在** → 确认了，不依赖它
2. ✅ **PM2 进程是 running 的** → 说明 `JWT_SECRET` 已从其他途径加载成功（大概率是旧的 `ecosystem.config.js` 内联了它）
3. ✅ **`buildGeneratePrompt` 在 aiPrompt.js 中不存在** → **根本原因**：git pull 没有更新 `aiPrompt.js`
4. ✅ **`[PM2][WARN] Environment [production] is not defined in process file`** → 启动时不要加 `--env production`

所以这次修复的**唯一正确路径**是：
- **先修 git**（`git fetch && git reset --hard origin/reborn`）→ 让 `aiPrompt.js` 更新到最新版
- **再重启 PM2**（`pm2 delete && pm2 start ecosystem.config.js`）
