# /review — 代码审查（基于 Code Guardian MCP）

## 触发
用户输入 `/review`

## 流程

### Step 1: 确认 Code Guardian 已连接
检查 MCP Server 列表中是否存在 `code-guardian`。若未连接，提示用户先在设置中启用。

### Step 2: 获取待审查文件
1. 读取 `.trae/workflow-bridge/context.json` 中的 `lastModifiedFiles`。
2. 若无上下文，询问用户要审查哪个文件。

### Step 3: 调用 full_health_check
对每个待审查文件调用 MCP Tool：

```
code-guardian:full_health_check({ filePath: "frontend/src/views/AiChat.vue" })
```

### Step 4: 逐项展示检查结果
根据返回的 `summary` 展示：

| 检查项 | 状态 |
|--------|------|
| 文件大小 | ✅ / ❌ |
| ESLint | ✅ / ❌ |
| 架构合规 | ✅ / ❌ |
| 反模式 | ✅ / ❌ |
| 注释规范 | ✅ / ❌ |

对每项不通过的，列出具体文件、行号、问题描述。

### Step 5: 输出结论
- **通过**：5 项全通过
- **有条件通过**：仅有 warning 或低风险建议
- **不通过**：存在 error / 架构违规 / 反模式 / 缺少关键注释

## 裁决规则

当"AI 说没问题"与"Code Guardian 检查发现违规"冲突时，**听工具的**。工具不会撒谎。
