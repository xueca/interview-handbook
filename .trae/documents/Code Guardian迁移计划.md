# Code Guardian MCP Server 迁移计划

> 目标：将 `/review` + `after-write.cjs` + Husky 三层等效能力，统一升级为 Code Guardian MCP Server
> 核心原则：**不删除安全网，而是给 AI 增加"主动调用"的能力层**

---

## 一、核心设计决策：不替换，而是加层

```
迁移前（三层防御）                    迁移后（四层防御）
                                   
Layer 1: ❌ 无（AI 不主动检查）       Layer 1: 🆕 Code Guardian MCP Tools
                                              AI 编码中主动调用
Layer 2: after-write Hooks           Layer 2: after-write Hooks（保留，简化）
         PostToolBatch 自动触发               PostToolBatch 自动触发
Layer 3: /review Command             Layer 3: /review Command（保留，改为调 MCP）
         手动触发 5 步审查                    手动触发 → 调用 MCP full_health_check
Layer 4: Husky pre-commit            Layer 4: Husky pre-commit（保留，不变）
         git commit 时触发                    git commit 时触发
```

**关键认知**：MCP Tool 是 AI 的"主动检查能力"，Hooks 和 Husky 是"被动安全网"。两者不冲突，互为补充。

---

## 二、文件清单：创建 / 修改 / 保留 / 删除

### 2.1 创建（6 个新文件）

| 文件 | 行数 | 职责 |
|------|:---:|------|
| `my-mcp-server/code-guardian/index.js` | ~50 | MCP Server 入口，注册 6 个 Tool |
| `my-mcp-server/code-guardian/tools/check_file_size.js` | ~30 | 复用 `backend/scripts/check-file-size.js` 逻辑，支持指定文件路径 |
| `my-mcp-server/code-guardian/tools/run_eslint.js` | ~60 | 程序化调用 ESLint (FlatESLint API)，复用 `eslint.config.js` |
| `my-mcp-server/code-guardian/tools/validate_architecture.js` | ~50 | 复用 `eslint-plugin-architecture` 规则，检测 .vue 直接 fetch |
| `my-mcp-server/code-guardian/tools/detect_anti_patterns.js` | ~80 | 6 种反模式正则扫描（从 after-write.cjs 提取逻辑） |
| `my-mcp-server/code-guardian/tools/check_comment_compliance.js` | ~40 | 检查函数注释完整性（文件头注释 + 函数注释） |
| `my-mcp-server/code-guardian/tools/full_health_check.js` | ~30 | 聚合以上 5 个 Tool，输出结构化报告 |

**关于 `full_health_check`**：它不是一个独立的检查逻辑，而是按顺序调用前 5 个 Tool 并聚合结果。MCP 协议支持 Tool 内部调用其他 Tool。

### 2.2 修改（3 个现有文件）

| 文件 | 改动 | 理由 |
|------|------|------|
| `.trae/mcp.json` | 添加 `code-guardian` 配置 | 让 Trae Solo 能加载 Code Guardian |
| `.claude/settings.json` | 添加 `code-guardian` MCP 配置 | 让 Claude Code 能加载 Code Guardian |
| `.claude/commands/review.md` | 简化为调用 `full_health_check` | 从"手动 5 步"变为"一行 MCP 调用" |

### 2.3 保留不变（4 个文件）

| 文件 | 保留理由 |
|------|---------|
| `.claude/hooks/after-write.cjs` | **安全网**：AI 不主动调 MCP 时，Hook 兜底检查 |
| `.husky/pre-commit` | **安全网**：commit 时最终防线，与 MCP 不在同一层 |
| `backend/scripts/check-file-size.js` | **被 MCP 复用**：`check_file_size` Tool 内部 require 它 |
| `frontend/eslint-plugin-architecture/index.js` | **被 MCP 复用**：`validate_architecture` Tool 内部调用 ESLint 并过滤此规则 |

### 2.4 删除（0 个文件）

**不需要删除任何文件。** 等效能力全部保留作为安全网，Code Guardian 是新增的"主动调用层"。

---

## 三、实施步骤（按依赖顺序）

### Step 1：创建 MCP Server 脚手架（30 分钟）

```
my-mcp-server/code-guardian/
├── index.js          ← MCP Server 入口
├── tools/
│   ├── check_file_size.js
│   ├── run_eslint.js
│   ├── validate_architecture.js
│   ├── detect_anti_patterns.js
│   ├── check_comment_compliance.js
│   └── full_health_check.js
└── package.json
```

**index.js 核心逻辑**：
```js
// my-mcp-server/code-guardian/index.js
// 文件功能: Code Guardian MCP Server 入口 | 数据流: AI 调用 → Tool 执行 → 结构化报告
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "code-guardian", version: "1.0.0" });

// 注册 6 个 Tool（每个 Tool 从 tools/ 目录 import）
server.tool("check_file_size", "检查指定文件是否超过行数限制", { filePath: z.string() }, async ({ filePath }) => { ... });
server.tool("run_eslint", "对指定文件运行 ESLint 检查", { filePath: z.string() }, async ({ filePath }) => { ... });
server.tool("validate_architecture", "检查架构合规（.vue 不能直接 fetch/EventSource）", { filePath: z.string() }, async ({ filePath }) => { ... });
server.tool("detect_anti_patterns", "扫描 6 种反模式", { filePath: z.string() }, async ({ filePath }) => { ... });
server.tool("check_comment_compliance", "检查注释规范", { filePath: z.string() }, async ({ filePath }) => { ... });
server.tool("full_health_check", "运行全部 5 项检查，输出结构化报告", { filePath: z.string() }, async ({ filePath }) => { ... });

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Step 2：逐个实现 Tool（2 小时，按复杂度排序）

**2a. `check_file_size.js`（最简单，~30 行）**
- 复用 `backend/scripts/check-file-size.js` 的行数限定逻辑
- 输入：文件路径
- 输出：行数是否超标，超了多少

**2b. `run_eslint.js`（~60 行）**
- 使用 ESLint 的 `FlatESLint` API 程序化加载 `eslint.config.js`
- 输入：文件路径
- 输出：错误数、警告数、具体报错列表

**2c. `validate_architecture.js`（~50 行）**
- 调用 `run_eslint.js` 并过滤出 `eslint-plugin-architecture/no-direct-fetch-in-views` 规则的报错
- 输入：文件路径
- 输出：架构违规项列表

**2d. `detect_anti_patterns.js`（~80 行）**
- 从 `after-write.cjs` 提取 6 种反模式检测逻辑（正则扫描）
- 6 种模式：裸 async 无 try-catch、timer 未清理、SSE 未清理、AbortController 未清理、模块级变量、.vue 直接 API 调用
- 输入：文件路径
- 输出：每种模式的命中列表

**2e. `check_comment_compliance.js`（~40 行）**
- 检查文件头注释是否存在（`// 文件功能:` 模式）
- 检查每个函数是否有注释（`// xxx` 或 `/** xxx */`）
- 输入：文件路径
- 输出：缺失注释的函数列表

**2f. `full_health_check.js`（~30 行）**
- 按顺序调用 5 个 Tool，聚合结果
- 输出：结构化报告（同 /review 的 5 步输出格式）

### Step 3：配置 MCP 通路（10 分钟）

**3a. 更新 `.trae/mcp.json`**：
```json
{
  "mcpServers": {
    "echo-server": { ... },
    "code-guardian": {
      "command": "node",
      "args": ["D:\\BaiduNetdiskDownload\\A055\\sql\\trae\\shuju\\webtest\\interview-handbook\\my-mcp-server\\code-guardian\\index.js"]
    }
  }
}
```

**3b. 更新 `.claude/settings.json`**：
```json
{
  "mcpServers": {
    "code-guardian": {
      "command": "node",
      "args": ["my-mcp-server/code-guardian/index.js"]
    }
  },
  "hooks": { ... }
}
```

### Step 4：验证 MCP 通路（10 分钟）

```bash
cd my-mcp-server/code-guardian
node index.js
# 预期：stdio 模式下等待 JSON-RPC 请求，无报错退出
```

在 Trae Solo 或 Claude Code 中测试：
```
"对 src/views/AiChat.vue 运行 full_health_check"
```

预期：AI 调用 `code-guardian` 的 `full_health_check` Tool，输出结构化报告。

### Step 5：简化 `/review` Command（10 分钟）

**修改 `.claude/commands/review.md`**：

```diff
- # /review — 代码审查
- 
- ## 触发
- 用户输入 /review
- 
- ## 流程
- 1. 读取 .trae/rules/ 下 6 个规则文件
- 2. 对被修改文件逐项检查：
-    - run: cd frontend && npx eslint src/
-    - run: cd backend && node scripts/check-file-size.js
-    - 扫描 .vue 是否有直接 fetch/axios（对照 03-anti-patterns.md）
-    - 扫描是否有 async 无 try-catch
-    - 检查函数是否 ≤ 30 行
- 3. 输出结构化验证报告（格式同 verify-refactor）

+ # /review — 代码审查（基于 Code Guardian MCP）
+ 
+ ## 触发
+ 用户输入 /review
+ 
+ ## 流程
+ 1. 确认 Code Guardian MCP Server 已连接
+ 2. 对当前改动的文件调用 full_health_check(filePath)
+ 3. 逐项展示检查结果（ESLint / 文件大小 / 架构合规 / 反模式 / 注释）
+ 4. 如果检查不通过，指出具体问题文件和行号
+ 5. 输出最终结论：通过 / 有条件通过 / 不通过
```

### Step 6：决定是否简化 `after-write.cjs`（可选，10 分钟）

**选项 A（推荐）：保留 after-write.cjs 不变**
- 理由：它是安全网，AI 不调 MCP 时仍然生效
- 它与 Code Guardian 是不同触发层，不冲突

**选项 B：简化 after-write.cjs**
- 只保留最轻量的检查（文件大小），其余交给 MCP
- 从 134 行缩减到 ~40 行

**建议选 A**。安全网不嫌多，after-write.cjs 的 134 行不占 AI 上下文，只占磁盘空间。

---

## 四、迁移后的工作流

```
AI 收到"修改 AiChat.vue"指令
    │
    ├─ 修改前：AI 主动调用 code-guardian:full_health_check("AiChat.vue")
    │           → 了解当前文件状态
    │
    ├─ 修改中：每改完一个函数，AI 主动调用 code-guardian:check_file_size
    │           → 确保不超行数
    │
    ├─ 修改后：PostToolBatch Hook 自动触发 after-write.cjs
    │           → 安全网检查文件大小 + 反模式
    │
    ├─ 提交前：AI 主动调用 code-guardian:full_health_check
    │           → 完整 5 项检查
    │
    └─ git commit：Husky pre-commit 自动触发 ESLint
                   → 最终安全网
```

---

## 五、与现有等效能力的对应关系

| 等效能力 | Code Guardian 对应 Tool | 迁移后状态 |
|---------|----------------------|-----------|
| after-write.cjs — 文件大小检查 | `check_file_size` | Hook 保留作安全网，AI 可主动调用 |
| after-write.cjs — 反模式扫描 | `detect_anti_patterns` | Hook 保留作安全网，AI 可主动调用 |
| /review Step 1 (ESLint) | `run_eslint` | Command 保留，改为调 MCP Tool |
| /review Step 2 (文件大小) | `check_file_size` | Command 保留，改为调 MCP Tool |
| /review Step 3 (架构合规) | `validate_architecture` | Command 保留，改为调 MCP Tool |
| /review Step 4 (SSE 专项) | `detect_anti_patterns`（SSE 部分） | Command 保留，改为调 MCP Tool |
| /review Step 5 (代码质量) | `check_comment_compliance` | Command 保留，改为调 MCP Tool |
| Husky pre-commit | `run_eslint` | 不变，commit 时最终防线 |

---

## 六、不删除文件的理由

| 文件 | 为什么不删 |
|------|----------|
| `.claude/commands/review.md` | 用户手动触发 `/review` 的入口，改为调 MCP 后更简洁 |
| `.claude/hooks/after-write.cjs` | AI 可能不主动调 MCP，Hook 是兜底安全网 |
| `.husky/pre-commit` | commit 时最终防线，与 MCP（编码时）是不同时间点 |
| `backend/scripts/check-file-size.js` | 被 `check_file_size` Tool 复用，是 MCP 的依赖 |
| `frontend/eslint-plugin-architecture/` | 被 `validate_architecture` Tool 复用，是 MCP 的依赖 |

**核心原则：MCP 是"主动调用层"，Hooks/Husky 是"被动安全网"。多一层保护，少一个 bug。**