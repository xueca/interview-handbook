# 项目规则索引

> **最后更新**: 2026-06-09  
> **作用范围**: 面试宝典项目的所有代码生成、修改、重构  
> **执行级别**: 🔴 **强制** — 任何代码操作都必须遵守

---

## 📈 当前进度快照

> 详细进度见 [PROJECT_STATE.md](../PROJECT_STATE.md)，本节仅作概览。

| 阶段 | 状态 |
|------|------|
| Week1（Day1-7）基础框架 + 认证 + 题库 | ✅ 完成 |
| Week2（Day8-14）答题流程 + 错题本 + 统计 | ✅ 完成 |
| Week3（Day15-21）AI 出题 + SSE + 对话 | ✅ 完成 |
| Week4（Day22-26）暗黑 / 响应式 / 交互细节 / 个人中心 / 安全加固 | ✅ 完成 |
| Week5 部署上线（Nginx / PM2 / SSE 生产配置） | ⏳ 待开始 |

- 当前接口数：**17** 个 REST 端点
- 代码体检：后端 `check-file-size` 全通过（含 `utils/validator.js`、`middleware/rateLimit.js`）、前端 ESLint 0 error

---

## 📋 快速导航

| 规则 | 优先级 | 范围 | 详情 |
|------|--------|------|------|
| 1. 架构分层契约 | 🔴 强制 | 全局 | [01-architecture-contract.md](../.trae/rules/01-architecture-contract.md) |
| 2. 文件大小限制 | 🔴 强制 | 全局 | [02-file-size-limits.md](../.trae/rules/02-file-size-limits.md) |
| 3. 反模式清单 | 🔴 强制 | 全局 | [03-anti-patterns.md](../.trae/rules/03-anti-patterns.md) |
| 4. SSE架构契约 | 🟡 条件 | AiChat相关 | [04-sse-contract.md](../.trae/rules/04-sse-contract.md) |
| 5. 编码纪律 | 🔴 强制 | 全局 | [05-coding-discipline.md](../.trae/rules/05-coding-discipline.md) |
| 6. 注释规范 | 🔴 强制 | 新代码 | [06-comment-standard.md](../.trae/rules/06-comment-standard.md) |

---

## 🎯 核心约束（必读）

### 1️⃣ 数据流方向（绝对禁止反向）

```
views/*.vue  →  composables/use*.js  →  api/*.js  →  backend
```

**禁止操作**:
- ❌ 视图层直接 fetch/axios/EventSource
- ❌ API层处理业务逻辑
- ❌ Composable层操作DOM
- ❌ Store跨模块引用

---

### 2️⃣ 文件行数硬上限（无例外）

| 文件类型 | 行数限制 | 超标处理 |
|---------|---------|---------|
| .vue 组件 | ≤ 200行 | 拆composable / 子组件 |
| .js 逻辑文件 | ≤ 150行 | 拆工具模块 |
| controller | ≤ 150行 | 拆service/工具函数 |
| 单个函数 | ≤ 30行 | 拆小函数 |
| 函数参数 | ≤ 4个 | 用对象包裹 |

**注**: 注释行不计入行数

---

### 3️⃣ 6种绝对禁止的操作

1. **在组件内直接写API调用** → 必须走 composable → api 层
2. **超过3行的数据转换** → 抽成 composable 或 util 函数
3. **async函数不catch** → 每个异步操作都要 try-catch
4. **timer/SSE/AbortController不清理** → onUnmounted 中必须清理
5. **模块级变量持有组件状态** → 状态只能在 ref/reactive 中
6. **重复代码超过3处** → 立即抽成 composable / util / 子组件

---

### 4️⃣ 注释规范（新代码强制）

**文件头必加**:
```js
// 文件功能: xxx | 数据流: xxx → xxx → xxx
```

**函数必加**:
- ≤15行: 单行注释说明意图
- 16-30行: JSDoc (`@param`, `@returns`, `@sideEffect`)

**关键注释**:
- 复杂逻辑 → 标注"为什么"而非"怎么做"
- 竞态条件 → 标注"可能的问题和解决方案"
- 数据转换 → 标注每一步转换的意图

---

### 5️⃣ 编码四大原则

| 原则 | 说明 |
|------|------|
| **编码前思考** | 不准假设。歧义时列出所有可能，让用户选择 |
| **简洁优先** | 最少代码解决问题。不过度设计 |
| **精准修改** | 只改必须改的。新代码按规范加注释 |
| **目标驱动** | 先写目标，再分步执行，每步验证 |

---

## 🔍 SSE特定规则（AiChat相关）

仅在修改以下文件时触发:
- `frontend/src/views/AiChat.vue`
- `frontend/src/composables/useAiChat.js`
- `frontend/src/api/sse.js`
- `backend/controllers/aiController.js`

**关键点**:
- 三段式数据流: `content` → `status` → `parsed`
- API层只做HTTP连接，业务状态管理在composable
- 视图层只渲染，不处理SSE逻辑

---

## ⚖️ 裁决规则（冲突时听谁的）

| 冲突 | 决策 |
|------|------|
| 效率 vs 分层 | **听分层的** — 直接fetch是破窗效应 |
| 功能完成 vs 文件超行 | **听行数限制的** — 拆文件5分钟，重构屎山5小时 |
| 简单实现 vs 反模式 | **听反模式的** — 这是屎山的起点 |
| SSE放视图层 vs 分层 | **听分层的** — 视图层只负责"显示"，不负责"怎么拿到" |

---

## 📌 执行流程

### 使用 `/generate-with-constraints` 时:

1. ✅ 自动读取本文件 + 链接的规则
2. ✅ 输出设计（目录树 + 架构说明 + 文件清单）
3. ✅ 等用户确认
4. ✅ 按规范生成代码
5. ✅ 自检：P0(安全) / P1(架构) / P2(质量)

### 使用 `/refactor-shit-mountain` 时:

1. ✅ 诊断：运行 ESLint + 文件大小检查
2. ✅ 参考规则，规划重构
3. ✅ 执行重构
4. ✅ 验证：0 Error + 0 超标

### 日常修改时:

1. ✅ 修改前检查相关规则
2. ✅ 新代码必须加注释
3. ✅ 提交前过一遍规则清单

---

## 🚀 如何快速查阅

- **我要了解分层** → 读 [01-architecture-contract.md](../.trae/rules/01-architecture-contract.md)
- **我要了解行数限制** → 读 [02-file-size-limits.md](../.trae/rules/02-file-size-limits.md)
- **我的代码有问题** → 检查 [03-anti-patterns.md](../.trae/rules/03-anti-patterns.md)
- **我在做注释** → 参考 [06-comment-standard.md](../.trae/rules/06-comment-standard.md)
- **我在写SSE** → 查 [04-sse-contract.md](../.trae/rules/04-sse-contract.md)
- **我不知道怎么开始** → 遵循 [05-coding-discipline.md](../.trae/rules/05-coding-discipline.md)

---

## 📞 规则有问题？

如果你发现规则与实际冲突，**直接告诉我**。我会：
1. 指出规则的哪部分不合理
2. 建议修改方案
3. 更新规则文件

---

**下次对话时，我会自动读取本文件 + 相关规则。你不用每次都提醒我。**
