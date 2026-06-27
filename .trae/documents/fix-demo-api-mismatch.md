# 修复 Demo 录制的 API 层不匹配问题

## 问题摘要

录 demo 时发现 Profile 页面"密码修改失败"（500 错误）。根因是 **前端 API 文件的工作区版本与 git HEAD 不一致**——工作区里的 `records.js`、`questions.js`、`request.js` 回退到了旧版本，函数名/导出与 composable 层的 import 不匹配，导致 Vite 构建失败，线上前端代码也是旧的。

## 现状分析

### Git HEAD（已提交版本）= 正确版本

| 文件 | HEAD 状态 | 说明 |
|------|----------|------|
| `api/auth.js` | ✅ 正确 | 5 个函数：register, login, getMe(`/auth/me`), changePassword, updateUsername |
| `api/questions.js` | ✅ 正确 | 4 个函数：getList, getDetail, **createQuestion**, removeQuestion |
| `api/records.js` | ✅ 正确 | 6 个函数：submitRecord, getRecords, getStats, **getWrong**, **toggleMark**, **getMarks** |
| `api/request.js` | ✅ 正确 | 使用 `request` 变量名，含 ElMessage 错误提示 |

### 工作区（磁盘上的文件）= 有回退

| 文件 | 工作区状态 | 问题 |
|------|----------|------|
| `api/auth.js` | ≈ 正确 | 仅缺尾部换行，与 HEAD 几乎一致 |
| `api/questions.js` | ❌ 缺函数 | 缺少 `createQuestion`（AiChat.vue 需要），有 removeQuestion |
| `api/records.js` | ❌ 函数名错 | 用 `getWrongRecords` 而非 `getWrong`；用 `markCorrect` 而非 `toggleMark`；缺 `getMarks`；多了无后端对应的 `getRecord`/`deleteRecord` |
| `api/request.js` | ❌ 回退旧版 | 变量名 `service` vs HEAD 的 `request`；无 ElMessage 错误提示；timeout 7000 vs 10000 |

### 构建错误

```
src/composables/useWrongBook.js (3:9): "getWrong" is not exported by "src/api/records.js"
```

### 导入关系验证

| Composable/View | 导入 | records.js HEAD | records.js 工作区 |
|----------------|------|----------------|-----------------|
| `useWrongBook.js` | `getWrong` | ✅ | ❌ 叫 getWrongRecords |
| `useWrongBook.js` | `getMarks` | ✅ | ❌ 不存在 |
| `useWrongBook.js` | `toggleMark` | ✅ | ❌ 叫 markCorrect |
| `useQuiz.js` | `submitRecord` | ✅ | ✅ |
| `stores/record.js` | `getStats` | ✅ | ✅ |
| `AiChat.vue` | `createQuestion` | ✅ | ❌ 不存在 |

## 修复方案

### Step 1: 从 git HEAD 恢复 API 文件

HEAD 版本已经包含所有正确的函数。直接从 HEAD 恢复 4 个 API 文件：

```bash
git checkout HEAD -- frontend/src/api/
```

这会把 `auth.js`、`questions.js`、`records.js`、`request.js`、`sse.js`、`ai.js` 全部恢复到已提交的正确版本。

### Step 2: 修复 git index 损坏

git status 报 `error: short read while indexing` 多个文件。需要重建 index：

```bash
git read-tree --reset HEAD
git checkout-index -a
```

然后重新 `git status` 确认状态干净。

### Step 3: 构建验证

```bash
cd frontend && npm run build
```

预期：构建成功，无报错。

### Step 4: 检查剩余 diff

恢复 API 文件后，检查是否还有其他未提交的工作区改动需要处理：

```bash
git status --short
git diff --stat
```

### Step 5: 提交 + 推送

```bash
git add frontend/src/api/
git commit -m "fix: restore api layer files to match composable imports"
git push origin reborn
```

### Step 6: 服务器部署

SSH 到 8.138.219.100 执行：

```bash
cd /opt/interview-handbook
git pull origin reborn
cd frontend && npm run build
cd .. && pm2 reload interview-handbook
```

### Step 7: 线上验证

- 访问 Profile 页面，测试修改密码
- 测试修改用户名
- 测试错题本页面加载
- 测试 AI 对话页"加入题库"功能

## 假设与决策

1. **选择从 HEAD 恢复而非手动修改工作区**：HEAD 版本已经过之前 session 的仔细校验，包含正确的函数名和后端路由对应关系。手动修改容易遗漏。
2. **不改动后端**：后端 `authController.js`、`recordController.js`、`questionController.js` 的逻辑和路由均正确，问题只在前端 API 层。
3. **git index 重建**：`short read` 错误说明 index 有损坏，需要重建以确保后续 git 操作正常。

## 验证清单

- [ ] `npm run build` 构建成功
- [ ] `git status` 无异常
- [ ] 线上 Profile 页：修改密码成功 → 跳转登录页
- [ ] 线上 Profile 页：修改用户名成功 → 侧边栏同步更新
- [ ] 线上错题本页：正常加载错题列表
- [ ] 线上 AI 对话页：加入题库功能正常
