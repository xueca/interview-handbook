# /new-feature — 新功能脚手架

## 触发
用户输入 `/new-feature` 或 "我要加新功能"、"帮我设计一个功能"。

## 执行流程

### Step 1: 加载项目上下文

读取以下文件了解项目状态：

- `.trae/workflow-bridge/current-plan.json` — 当前是否有未执行计划
- `.trae/workflow-bridge/context.json` — 上次会话上下文
- `PROJECT_STATE.md` — 已完成模块、进行中的模块、禁区清单
- `.trae/rules/01-architecture-contract.md` — 架构契约
- `.trae/rules/02-file-size-limits.md` — 文件规模约束

### Step 2: 确认需求

如果用户没有说明具体功能，先列出 3 个可能的方向供选择；
如果用户已说明功能，确认涉及哪个模块、是否破坏现有接口签名。

### Step 3: 输出设计

在写代码前必须输出以下内容并等待用户确认：

1. **目录结构**（树状图）
2. **架构说明**（为什么这样设计）
3. **文件清单**（每文件作用一句话 + 预估行数）
4. **接口契约**（如新增后端接口，列出 method/path/request/response）
5. **入口文件**（只写 1 个主要入口文件，关联链由 Project Context 的 `find_related_files` 在 Claude Code 执行阶段动态解析）
6. **任务拆分**（按 `specs/<feature>/tasks.md` 格式输出 checklist）

### Step 4: 写入 Spec（用户确认后）

如果用户确认设计，创建：

- `.trae/specs/<feature>/spec.md` — 需求规格
- `.trae/specs/<feature>/tasks.md` — 执行任务清单
- `.trae/specs/<feature>/checklist.md` — 验收 checklist

并更新 `.trae/workflow-bridge/current-plan.json`：

```json
{
  "id": "<feature>",
  "title": "功能标题",
  "source": "trae-solo",
  "createdAt": "ISO-8601",
  "summary": "一句话概要",
  "tasks": [...],
  "entryFile": "入口文件路径",
  "notes": "注意事项",
  "status": "pending"
}
```

### Step 5: 切换执行工具

新功能设计完成后，**不要自己写代码**。

告诉用户：
> "设计已完成并写入 `.trae/specs/<feature>/`。请切换到 Claude Code 执行 `/apply-plan`，或在 Trae Solo 中继续讨论。"

## 输出格式

```
## 新功能设计：{功能名}

### 1. 目录结构
```
...
```

### 2. 架构说明
...

### 3. 文件清单
| 文件 | 作用 | 预估行数 |
|------|------|---------|
| ... | ... | ... |

### 4. 接口契约
...

### 5. 入口文件
- 入口文件: `{entryFile}`
- 关联文件链: 由 Project Context `find_related_files({entryFile})` 在 Claude Code 执行阶段解析

### 6. 任务拆分
- [ ] task 1
- [ ] task 2
...

### 7. 需要你确认
- 这个设计是否满足需求？
- 是否有文件/接口需要调整？
- 确认后我将写入 spec 并更新 current-plan.json。
```