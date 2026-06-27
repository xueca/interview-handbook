# 修复个人中心 API 问题

---

## Summary

线上服务器（8.138.219.100）个人中心页面修改密码失败，返回 500 错误。根因是前端 `frontend/src/api/auth.js` 文件不完整：缺少 `changePassword` 和 `updateUsername` 函数导出，且 `getMe()` 路径错误（`/auth/user` 应为 `/auth/me`）。需修复前端 API 文件并重新部署。

---

## Current State Analysis

### 问题现象（截图）

- 页面顶部显示红色错误："密码修改失败，请稍后重试"（出现两次）
- 控制台错误：`PUT http://8.138.219.100/api/auth/password 500 (Internal Server Error)`
- 用户填写了新密码 "L12345" 并点击"确认修改"

### 根因分析

**前端 `frontend/src/api/auth.js`（当前版本）**：
```js
export function getMe(){
    return request.get('/auth/user')  // ❌ 路径错误，应为 /auth/me
}
// ❌ 缺少 changePassword 函数
// ❌ 缺少 updateUsername 函数
```

**后端 `backend/routes/auth.js`（正确）**：
```js
router.get('/me', auth, authController.getMe)           // ✅
router.put('/password', auth, authController.changePassword)  // ✅
router.put('/username', auth, authController.updateUsername)  // ✅
```

**参考文件 `records-api-bak/auth.js`（完整版本）**：
```js
export function getMe() {
  return request.get('/auth/me')  // ✅ 正确路径
}
export function changePassword(newPassword) {
  return request.put('/auth/password', { newPassword })  // ✅
}
export function updateUsername(username) {
  return request.put('/auth/username', { username })  // ✅
}
```

### 影响范围

- 修改密码功能：完全不可用
- 修改用户名功能：完全不可用
- 获取个人信息：可能 404（路径错误）

---

## Proposed Changes

### Step 1: 修复 `frontend/src/api/auth.js`

**What**：补全缺失的 API 函数，修正路径错误。

**Why**：当前文件只有 `register`、`login`、`getMe`（路径错误），缺少 `changePassword` 和 `updateUsername`，导致个人中心两个功能完全不可用。

**How**：

将 `frontend/src/api/auth.js` 内容替换为：

```js
import request from './request'

export function register(username, password) {
  return request.post('/auth/register', { username, password })
}

export function login(username, password) {
  return request.post('/auth/login', { username, password })
}

export function getMe() {
  return request.get('/auth/me')
}

// 修改密码：已登录用户直接重置，无需旧密码
export function changePassword(newPassword) {
  return request.put('/auth/password', { newPassword })
}

// 修改用户名：返回 { token, user }，调用方需用新 token 刷新登录态
export function updateUsername(username) {
  return request.put('/auth/username', { username })
}
```

**变更点**：
1. `getMe()` 路径：`/auth/user` → `/auth/me`
2. 新增 `changePassword(newPassword)` 函数
3. 新增 `updateUsername(username)` 函数
4. 统一代码风格（空格、换行）

---

### Step 2: 本地验证

**What**：确认修复后前端能正常编译，API 调用路径正确。

**How**：

```bash
# 1. 检查文件内容
cat frontend/src/api/auth.js

# 2. 前端构建测试
cd frontend
npm run build

# 3. 检查构建产物中是否包含新函数
grep -r "changePassword" dist/
grep -r "/auth/me" dist/
```

---

### Step 3: 部署到线上服务器

**What**：将修复后的代码推送到 GitHub，并在服务器上重新部署。

**How**：

```bash
# 本地提交
git add frontend/src/api/auth.js
git commit -m "fix: 补全 auth API 函数（changePassword/updateUsername）并修正 getMe 路径"
git push origin reborn

# 服务器部署
cd /var/www/interview-handbook
git pull origin reborn
cd frontend && npm ci && npm run build
cd ..
pm2 reload ecosystem.config.js --env production
```

---

### Step 4: 线上验证

**What**：在浏览器中测试个人中心功能。

**How**：

1. 打开 `http://8.138.219.100`，登录账号
2. 进入个人中心页面
3. 测试修改用户名：输入新用户名 → 点击保存 → 确认成功
4. 测试修改密码：输入新密码 → 确认密码 → 点击确认修改 → 确认跳转登录页
5. 用新密码重新登录，确认密码修改生效

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 参考文件 | `records-api-bak/auth.js` | 这是之前可用的完整版本，函数签名和路径都正确 |
| 代码风格 | 统一为简洁风格 | 与原文件保持一致，不引入多余注释 |
| 部署方式 | 先 push 再服务器 pull | 与现有部署流程一致 |

---

## Verification Steps

1. **本地构建**：`npm run build` 无报错
2. **API 路径**：构建产物中包含 `/auth/me`、`/auth/password`、`/auth/username`
3. **线上功能**：修改用户名成功、修改密码成功、新密码登录成功
4. **控制台**：无 500 错误，无 `undefined is not a function` 错误

---

## Rollback Plan

如果修复后出现问题：

```bash
# 回滚前端 API 文件
git checkout HEAD~1 -- frontend/src/api/auth.js

# 重新构建部署
cd frontend && npm run build
cd ..
pm2 reload ecosystem.config.js
```