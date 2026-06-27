# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目本质

Vue3 + Express + JSON 文件存储的面试刷题全栈应用。

## 铁律（不可违反）

- 数据流：`views/*.vue → composables/use*.js → api/*.js → backend`，单向不可逆
- 文件上限：`.vue` ≤ 200 行，`controller` / `composable` ≤ 150 行，`api/*.js` ≤ 50 行，函数 ≤ 30 行
- 禁区：`backend/middleware/auth.js`、`frontend/src/api/request.js`、`backend/data/index.js` 不可修改

## 常用命令

```bash
# 启动后端（port 5000）
cd backend && node app.js

# 启动前端（port 5173）
cd frontend && npm run dev

# 提交前检查（必须 0 errors）
cd frontend && npx eslint src/
cd backend && node scripts/check-file-size.js
```

## 修改验证协议（三阶段，必须严格执行）

任何文件改动，必须按以下顺序执行，不得跳过：

**阶段一：修改前**
- 调用 `code-guardian:full_health_check` 了解当前健康状态，作为基线

**阶段二：修改中**
- 每写完一个文件，立即调用 `code-guardian:check_file_size` 确认未超行
- 超行则立即拆分，不得继续下一个文件

**阶段三：修改后**
- 调用 `code-guardian:full_health_check` 与基线对比，验证无退化
- 有任何 error 必须当场修复，不得留给下一次

## 详细规则

见 `.trae/rules/`（6 个文件），需要时读取对应文件。

## 复用流程

见 `.claude/commands/`：

- `/review` — 代码审查
- `/new-feature` — 新功能脚手架（读取项目状态 → 输出设计 → 等确认）