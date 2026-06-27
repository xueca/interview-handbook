# 会话上下文压缩 | 2026-06-17 (已审计)

## 你是谁
计算机专业学生，基础薄弱，找日常实习（福建为主，深圳/杭州/成都/广州/上海/南京/武汉备选）。目标是借助 AI 工程化能力做错位竞争。

## 你的项目：面试宝典
Vue3 + Express + JSON 文件存储的全栈面试刷题应用。17 个 REST 端点，Week1-4 完成，Week5 部署待做。

## 你的 AI 编程基础设施

### 单一真相源（.trae/）
- `rules/` — 6 条规则（架构契约/文件大小/反模式/SSE契约/编码纪律/注释规范）
- `skills/` — 5 个 Skill（generate/refactor/verify/teach/drill）
- `specs/` — 5 个 Spec（Bug 修复的历史记录）
- `knowledge/` — 5 篇经验沉淀
- `documents/` — 审计后保留 10 个文档（4 个已删除/归档）
- `mcp.json` — echo-server 验证通路（`my-mcp-server/index.js`）

### Claude Code 执行层（.claude/）
- `settings.json` — PostToolBatch Hook
- `settings.local.json` — 长期 permissions
- `commands/review.md` — `/review` 5 步审查
- `hooks/after-write.cjs` — 文件大小 + 反模式检查
- `PROJECT_RULES.md` — 规则索引

### 关键架构决策
- Skills 单一源：.trae/skills/ 是唯一源
- 双工具协作：Trae Solo（Propose）+ Claude Code（Apply）
- 文档已审计：21 项资产 → 1 必须实现 / 13 正在使用 / 6 可归档 / 1 已删除

## 当前状态

### 已完成
- ✅ 基础设施搭建（Rules/Skills/Hooks/Commands/MCP 通路）
- ✅ knowledge/ 5 篇经验沉淀
- ✅ 文档审计与清理（删除 4 个冗余文档）
- ✅ 工作流闭环已建立

### 唯一待实现
- ⏳ Code Guardian MCP Server（~320 行，将规则校验从"AI 自觉"升级为"自动化工具链"）

### 日常待做
- 面试准备：drill plan + 押题计划 + 薄弱追踪（三个文档配合使用）
- Week5 部署（渐进式 Spec 跑一次完整闭环）
- 写第一个测试（aiController.generateStream）

## 错位竞争策略
不是"我会写代码"，而是"我会管理 AI 写代码"——Rules 体系、Hooks 自动质检、Spec Coding、知识飞轮。

## 投递方向
搜索词："前端实习"/"全栈实习"/"Java 实习"，日常实习（非暑期）。
附言："熟练使用 AI 辅助开发（Claude Code + Trae Solo），有完整的 AI 工程化项目经验，可随时到岗，能长期实习。"