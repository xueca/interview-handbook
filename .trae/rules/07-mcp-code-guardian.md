# MCP Code Guardian 强制调用规则

> 版本: v1.0 | 项目: 面试宝典（Interview Handbook）
> 本规则始终生效。任何涉及代码修改的操作都必须遵守。

## 适用场景

所有涉及 `.vue` / `.js` 文件修改的任务，包括：
- 新增功能 / 组件 / 接口
- 修复 bug
- 重构代码
- 修改现有文件

## 强制流程

修改任何代码文件时，必须按以下顺序调用 `code-guardian` MCP Server：

1. **修改前**：调用 `code-guardian:full_health_check({ filePath })`
   - 了解当前文件状态，记录已有问题
   - 如果文件已存在严重问题，先与用户确认是否在本次修复

2. **修改中**：每完成一个函数或模块的修改，调用 `code-guardian:check_file_size({ filePath })`
   - 确保文件不超过行数限制
   - 如果超标，立即拆分而不是继续写

3. **修改后**：调用 `code-guardian:full_health_check({ filePath })`
   - 验证修改没有引入新问题
   - 检查 ESLint、架构合规、反模式、注释规范

4. **修复循环**：如果任何检查返回 `ok: false`，必须先修复问题，再向用户报告完成

## 检查优先级

修改文件时应优先关注：

| 优先级 | 检查项 | 对应 Tool |
|--------|--------|-----------|
| P0 | ESLint 0 Error | run_eslint |
| P0 | 视图层无直接 API 调用 | validate_architecture |
| P0 | 无裸 async / 资源泄露 / 模块级状态 | detect_anti_patterns |
| P1 | 文件行数未超标 | check_file_size |
| P1 | 架构依赖方向正确 | validate_architecture |
| P2 | 文件头注释和函数注释完整 | check_comment_compliance |

## 禁止行为

- ❌ 禁止不调用 Code Guardian 就直接修改代码文件
- ❌ 禁止在 `full_health_check` 返回 ❌ 时向用户报告"任务完成"
- ❌ 禁止忽略 `ok: false` 的检查结果继续下一步操作

## 输出要求

每次调用 Tool 后，简要说明：
- 调用了哪个 Tool
- 检查结果是什么
- 是否需要修复

## 与 Hook 的关系

本规则是**主动约束**，要求 AI 在修改前后主动调用 MCP Tool。
`.claude/hooks/after-write.cjs` 是**被动兜底**，在写入后检查。即使 AI 忘记调用 Code Guardian，Hook 也会报错。

当"AI 判断可跳过"与"规则要求调用"冲突时，**听规则的**。
