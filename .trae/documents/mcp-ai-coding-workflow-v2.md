# MCP 改造 AI 编码工作流：可复用、跨项目、企业级

> 研究日期：2026-06-16 | 版本：v2.2（基于 Claude Code 官方解释修正）
> 核心结论：RAG/MCP 不应作用于项目功能本身，而应作用于 AI 编码工作流。Claude Code CLI 与 Trae IDE 的 MCP 配置**完全隔离**，Claude Code 需通过 `settings.json` 的 `mcpServers` 字段独立配置，而非复用 Trae 的 `.trae/mcp.json`。

---

## 一、方向纠偏：为什么 v1 方案跑偏了

### v1 方案的问题

| v1 方向 | 用户反馈 | 根因 |
|---------|---------|------|
| MCP 上下文压缩 | "不如 Trae 自带的压缩能力" | 重复造轮子，Trae Solo 已经做了 |
| RAG AI 对话增强 | "需要重构很多代码，SSE 打字效果受影响，增加面试复习负担" | 动了项目核心功能，影响用户体验 |
| RAG 错题推荐 | "性价比低" | 锦上添花，不是刚需 |

### 正确的方向

> **RAG/MCP 应该改造的是"AI 帮你写代码的方式"，不是"用户使用项目的方式"。**

```
❌ v1: RAG/MCP → 面试宝典项目功能（AI 对话增强、错题推荐）
✅ v2: RAG/MCP → AI 编码工作流（规则校验、上下文管理、工具桥接）
```

---

## 二、你的 AI 编码工作流现状

### 2.1 三工具分工 + MCP 支持度

```
Trae Solo（大框架）
  │  做：架构设计 / 全局规划 / 方案生成 / 多文件重构
  │  有：完整的项目上下文（PROJECT_STATE.md + rules + skills）
  │  MCP: ✅ 支持完整（已通过 echo-server 验证）
  │
  ├── 计划产出（.trae/documents/xxx-plan.md）
  │
  ▼
Claude Code（局部实现）
  │  做：具体代码修改 / 单文件实现 / Bug 修复
  │  缺：每次新会话要重新建立项目上下文
  │  MCP: ⚠️ 支持不完整（stdio 传输下无法发现自建 MCP Server）
  │        路径配置需用 `claude mcp add` CLI 命令，而非 JSON 文件
  │
  ├── 代码产出
  │
  ▼
Trae IDE
     做：代码编辑 / 查看 / 手动微调
```

### 2.2 实测发现：Claude Code 与 Trae IDE 的 MCP 配置完全隔离

**Claude Code 的官方解释**（来自你的实测对话）：

> "我当前运行的是 Claude Code CLI（终端里的 `claude` 命令），不是 Trae 内置的 AI 助手。我看到的工具列表只有提示词里定义的那些（Bash、Read、Write、Edit、Grep、Glob 等），**看不到 Trae IDE 里配置的 MCP 工具**。"
>
> "如果你希望我在终端里也能调用你 Trae 里的 MCP 工具，可以把它配置成 **Claude Code 可访问的 MCP 服务**（通过 `settings.json` 的 `mcpServers` 字段），这样我就能通过 ToolSearch 发现并调用了。"

**关键发现**：

| 维度 | Trae Solo | Claude Code CLI |
|------|-----------|-----------------|
| **身份** | Trae IDE 内置的 AI 助手 | 独立的终端 CLI 工具 |
| **MCP 配置位置** | `.trae/mcp.json` | `settings.json` 的 `mcpServers` 字段 |
| **工具发现方式** | 直接读取 Trae 的 MCP 配置 | 通过 `ToolSearch` 扫描 `mcpServers` 中配置的服务 |
| **echo-server 实测** | ✅ 成功调用 | ❌ 未配置 → 看不到 → 退化为 Bash |
| **根本问题** | — | **不是"MCP 支持不完整"，而是"配置完全隔离"** |

**对 v2 方案的影响**：
- Claude Code **完全支持 MCP**，但需要**独立配置**（不能复用 Trae 的 `.trae/mcp.json`）
- 同一套 MCP Server 代码，只需在 Claude Code 的 `settings.json` 中再配一次即可
- 双轨模式（MCP vs CLI）可以统一为**单轨 MCP 模式**，两端分别配置

### 2.3 当前工作流的三个断点

**断点 1：Trae Solo → Claude Code 上下文丢失**

Trae Solo 产出计划文档后，Claude Code 开新会话，需要重新理解项目结构。虽然可以读 `PROJECT_STATE.md`，但每次都要手动告知"先读规则"，效率低。

**断点 2：Skills 是文本指令，不是可执行工具**

你的 5 个 Skills 非常完善，但本质是"告诉 AI 怎么做"的说明书。AI 需要自己执行每一步——读文件、跑 ESLint、检查行数。如果这些步骤能自动化（MCP Tool 一键执行），Skills 的效率能提升 3-5 倍。

**断点 3：规则校验依赖 AI 自觉**

6 条规则（架构契约/文件限制/反模式等）完全靠 AI 自觉遵守。长对话中规则确实会被遗忘。需要一个"不依赖 AI 记忆"的校验层。

---

## 三、MCP 改造方案：五个可复用 MCP Server

### 3.1 方案总览

```
┌─────────────────────────────────────────────────────┐
│  Trae Solo / Claude Code / 任何 MCP 兼容 AI 工具     │
├─────────────────────────────────────────────────────┤
│              ★ MCP 协议（统一标准）★                  │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ Code     │ Project  │ Workflow │ Git      │ Session │
│ Guardian │ Context  │ Bridge   │ Butler   │ Memory  │
│ (自建)   │ (自建)   │ (自建)   │ (自建)   │ (自建)  │
└──────────┴──────────┴──────────┴──────────┴─────────┘
```

**已有基础设施（会被 MCP Server 复用，不重复造轮子）**：

| 已有设施 | 位置 | MCP Server 复用的方式 |
|---------|------|---------------------|
| `check-file-size.js` | `backend/scripts/` | Code Guardian 调用它的逻辑，不再重写文件扫描 |
| `eslint-plugin-architecture` | `frontend/eslint-plugin-architecture/` | Code Guardian 直接复用 `no-direct-fetch-in-views` 等自定义规则 |
| `eslint.config.js` | `frontend/` | Code Guardian 用 ESLint 程序化 API 加载现有配置执行 |
| `husky` + `lint-staged` | `.husky/pre-commit` | Git Butler 作为 husky 的 AI 增强层，不替代它 |
| `commitlint` | `commitlint.config.js` | Git Butler 生成的 commit message 满足现有规范 |

### 3.2 Code Guardian MCP Server（核心，P0）

**定位**：不依赖 AI 记忆的自动化规则校验层。在 **Trae Solo** 和 **Claude Code** 中均作为 MCP Tool 使用，两端分别配置即可。

**配置方式**：

| 工具 | 配置位置 | 方式 |
|------|---------|------|
| **Trae Solo** | `.trae/mcp.json` | 手动配置（已验证 echo-server 通路） |
| **Claude Code** | `settings.json` 的 `mcpServers` 字段 | 独立配置（同一套 MCP Server 代码） |

**解决的 Skills**：`verify-refactor` Step 1-4 的自动化

**复用到新项目的方式**：把 `.trae/rules/` 目录复制过去，两端分别配置 MCP 即可。

#### 工具列表

| 工具名 | 功能 | 对应 Skill 步骤 |
|--------|------|----------------|
| `check_file_size` | 检查文件行数是否超标 | verify-refactor Step 1 |
| `run_eslint` | 运行 ESLint 并报告 | verify-refactor Step 1 |
| `validate_architecture` | 检查视图层是否违规调 API / controller 是否超行 | verify-refactor Step 2 |
| `detect_anti_patterns` | 扫描 6 种反模式（裸 async/未清理 timer/模块级状态等） | verify-refactor Step 3-4 |
| `check_comment_compliance` | 检查新增代码是否符合注释规范 | 06-comment-standard |
| `full_health_check` | 一键运行全部检查，输出验证报告 | verify-refactor 全部 Steps |

#### 使用示例

**场景 A：在 Trae Solo 中使用**

```
你（在 Trae Solo 中）：重构完 aiController.js 了，帮我验证一下

AI：（调用 full_health_check MCP Tool）
    ✅ ESLint: 0 Error
    ✅ 文件大小: aiController.js 148行（上限150）
    ⚠️ 反模式检测: generateStream 函数 32行（上限30行），建议拆分
    ✅ 架构合规: 无视图层违规
    ✅ 注释规范: 3个新增函数均已注释

    结论：有条件通过。需要拆分 generateStream（32→30行以下）。
```

**场景 B：在 Claude Code 中使用**

```
你（在 Claude Code 中）：重构完 aiController.js 了，帮我验证一下

AI：（调用 full_health_check MCP Tool，通过 settings.json 配置的 Code Guardian）
    ✅ ESLint: 0 Error
    ✅ 文件大小: aiController.js 148行（上限150）
    ⚠️ 反模式检测: generateStream 函数 32行（上限30行），建议拆分
    ✅ 架构合规: 无视图层违规
    ✅ 注释规范: 3个新增函数均已注释

    结论：有条件通过。需要拆分 generateStream（32→30行以下）。
```

#### 为什么这个最值

1. **完全可复用**：新项目只复制 `.trae/rules/` 目录，零配置开箱即用
2. **不依赖 AI 记忆**：规则文件保存在 MCP Server 侧，不受对话长度影响
3. **可作为 CI 质量门禁**：在 CI/CD 中作为 pre-commit check 的增强版（区别于 husky 的"提交时拦截"，Code Guardian 提供"编码时实时校验"）
4. **复用已有基础设施**：`check_file_size` 直接复用 `backend/scripts/check-file-size.js` 的扫描逻辑；`run_eslint` 加载项目已有的 `eslint.config.js` 和 `eslint-plugin-architecture`；不重复造轮子

#### 代码量估算

| 工具 | 行数 | 复用情况 |
|------|:---:|---------|
| `check_file_size` | ~20 | 🔄 复用 `backend/scripts/check-file-size.js` |
| `run_eslint` | ~60 | 🔄 复用 `eslint.config.js` + `eslint-plugin-architecture` |
| `validate_architecture` | ~50 | 新增：AST 扫描 .vue/.js 文件 |
| `detect_anti_patterns` | ~80 | 新增：6 种模式各需独立检测逻辑 |
| `check_comment_compliance` | ~40 | 新增：函数注释完整性检查 |
| `full_health_check` + MCP 框架 | ~70 | 聚合 + 错误处理 + 日志 |
| **合计** | **~320** | 乐观 ~280，悲观 ~350 |

### 3.3 Project Context MCP Server（P1）

**定位**：让 **Trae Solo** 和 **Claude Code** 快速建立项目上下文，两端分别配置 MCP 即可。

**解决的断点**：AI 需要手动读规则文件才能理解项目结构

**复用到新项目的方式**：新项目维护自己的 `PROJECT_STATE.md`，两端分别配置 MCP 即可。

#### 工具 + 资源

| 类型 | 名称 | 功能 |
|------|------|------|
| **Resource** | `project://state` | 返回 PROJECT_STATE.md 全文（含已完成模块、接口契约、禁区清单） |
| **Resource** | `project://rules/{rule_name}` | 返回指定规则文件内容 |
| **Resource** | `project://interfaces` | 返回所有跨模块接口契约 |
| **Tool** | `get_module_files(module_name)` | 返回某个模块的所有文件列表（如 "AI功能" → [aiController.js, aiPrompt.js, sse.js...]） |
| **Tool** | `find_related_files(file_path)` | 根据架构契约找到关联文件（如改 AiChat.vue → 返回 useAiChat.js → sse.js → aiController.js） |

#### 使用示例

```
你（在 Claude Code 新会话中）：我要修改 AI 对话的错误处理逻辑

AI：（调用 project://interfaces）
    已加载项目上下文：
    - AI 模块涉及文件：AiChat.vue → useAiChat.js → sse.js → aiController.js
    - 接口契约：SSE 三段式数据流（content → status → parsed）
    - 禁区：backend/middleware/auth.js、frontend/src/api/request.js
    
    （调用 find_related_files: AiChat.vue）
    相关文件链：AiChat.vue → useAiChat.js（147行）→ sse.js（46行）→ aiController.js（150行）

    请确认要修改的具体范围。
```

#### 价值

- 每次新会话节省 3-5 轮"先读规则"的沟通成本
- AI 不再需要"猜"项目结构，直接从 MCP Resource 获取准确信息
- 跨项目复用：新项目只需更新 `PROJECT_STATE.md`，两端分别配置 MCP 即可

### 3.4 Workflow Bridge（P1，文件共享，非 MCP）

**定位**：Trae Solo 和 Claude Code 之间的"共享记忆"。Trae Solo 产出计划后，Claude Code 通过**文件系统**读取，无需用户手动传话。

**为什么不用 MCP**：Workflow Bridge 的核心是"跨工具共享状态"，而文件系统是最简单可靠的共享方式。MCP 适合"调用工具"，不适合"存储状态"。

**解决的断点**：两工具之间没有共享状态

**复用到新项目的方式**：使用统一的 session 文件格式，与项目无关。

#### 文件列表（纯文件系统，无 MCP）

| 文件 | 功能 | 写入者 | 读取者 |
|------|------|--------|--------|
| `current-plan.json` | 保存当前任务计划（任务列表 + 入口文件 + 注意事项） | Trae Solo | Claude Code |
| `context.json` | 保存会话级临时上下文（当前任务、已修改文件、注意事项） | Trae Solo / Claude Code | 两者 |
| `history/` | 历史计划归档 | Trae Solo | 两者 |

#### 工作流示例

```
[Trae Solo 中]
你：帮我设计题库导出功能的架构
Trae Solo：分析了项目状态，设计了方案（产出 plan-export.md）
AI：（写入 .trae/workflow-bridge/current-plan.json）

[切换到 Claude Code]
AI：（读取 .trae/workflow-bridge/current-plan.json）
    检测到未执行计划：
    - 计划概要：新增 exportController + 前端导出按钮 + CSV/JSON 双格式
    - 入口文件：frontend/src/views/QuestionBank.vue
    
    （调用 Project Context: find_related_files(QuestionBank.vue)）
    - 关联文件链：QuestionBank.vue → useQuestionBank.js → api/questions.js → questionController.js
    
    请确认开始实施？[Y/n]
```

#### 存储设计

```
.trae/workflow-bridge/          ← 放在项目内，版本可控
├── current-plan.json           ← 当前计划 + 任务列表
├── context.json                ← 上次会话上下文
└── history/                    ← 历史计划归档
    ├── plan-export-20260616.json
    ├── plan-rag-20260610.json
    └── ...
```

#### 与 Project Context 的分工

| 问题 | 用哪个 |
|------|--------|
| "项目整体结构是什么？" | Project Context `project://state` |
| "改这个文件会影响哪些文件？" | Project Context `find_related_files` |
| "当前任务要做什么？" | Workflow Bridge `current-plan.json` |
| "上一步做到哪了？" | Workflow Bridge `context.json` |

Workflow Bridge 不重复存储"涉及文件链"，只在 `current-plan.json` 里保存任务入口文件；具体关联链由 Project Context 在运行时解析。

### 3.5 Git Butler（P2，husky 的 AI 增强版）

**定位**：不是替代 husky，而是**在 husky 之上加一层 AI 智能**。husky 负责"拦截不合规"（门禁），Git Butler 负责"智能生成 commit message + 预检查 + 状态更新"（增强）。

**配置方式**：Trae Solo 和 Claude Code 均可使用，两端分别配置 MCP 即可。

**与现有 husky 工作流的对比**：

```
现有流程（纯 husky）：
  git add → git commit → husky pre-commit 触发
    → lint-staged（ESLint 自动修复）
    → commitlint（校验 message 格式）
    → 通过 → commit 成功
    → 失败 → commit 被拦截（但用户不知道为啥，得自己跑 ESLint 看）

增强流程（husky + Git Butler MCP）：
  git add → AI 调用 smart_commit
    → Git Butler 自动检测改动（diff 分析）
    → Git Butler 调用 Code Guardian: pre_commit_check
       ✅ ESLint 0 Error  ← 复用 eslint.config.js
       ✅ 文件大小合规    ← 复用 check-file-size.js
    → Git Butler 生成 conventional commit message
    → 展示给用户确认
    → git commit -m "生成的message"
    → husky pre-commit 正常触发（二次兜底）
    → commitlint 校验通过
```

**关键区别**：husky 是"事后拦截"，Git Butler 是"事前辅助"。husky 告诉你"你提交失败了"，Git Butler 告诉你"我帮你检查过了，可以提交，message 是这个"。

#### 工具列表（不替代社区 GitHub MCP，独立自建）

| 工具名 | 功能 | 对应现有设施 |
|--------|------|-------------|
| `smart_commit` | 分析 `git diff` → 生成 conventional commit message → 用户确认后提交 | commitlint（生成时遵循其规则） |
| `pre_commit_check` | 提交前调用 Code Guardian 的 `full_health_check`，拦截不合规代码 | husky + lint-staged（AI 增强版） |
| `update_project_state` | commit 成功后，如果改动涉及模块状态变化，更新 `PROJECT_STATE.md` | 无现有对应（纯新增能力） |
| `generate_changelog` | 从 commit history 自动生成 CHANGELOG.md | 无现有对应 |

#### smart_commit 工作流

```
你：git commit

AI：（调用 smart_commit）
    📊 检测改动：
    - frontend/src/views/AiChat.vue: +5/-2 行（修复 loading 状态）
    - frontend/src/composables/useAiChat.js: +3/-1 行（修复 SSE 降级逻辑）
    
    🔍 预检查（调用 Code Guardian: pre_commit_check）：
    ✅ ESLint: 0 Error
    ✅ 文件大小: AiChat.vue 78行 / useAiChat.js 150行 → 均未超标
    ✅ 架构合规: 无视图层违规
    ✅ 注释规范: 3个新增函数均已注释
    
    💬 建议 commit:
    fix(ai-chat): 修复 SSE 流结束后 loading 状态未清除
    
    (b) 使用此消息  (e) 编辑  (s) 跳过检查强制提交
```

#### 与 Code Guardian 的分工

| | Code Guardian | Git Butler |
|---|---|---|
| **触发时机** | 编码中（AI 主动调用） | 提交前（AI 主动调用） |
| **目标** | 实时发现代码问题 | 确保提交的代码合规 |
| **输出** | 结构化验证报告 | commit message + 预检查结果 |
| **关系** | 底层校验引擎 | 消费 Code Guardian 的结果 |
| **可用工具** | Trae Solo + Claude Code（均通过 MCP） | Trae Solo + Claude Code（均通过 MCP）|

#### 复用到新项目

新项目需要：
1. 已配置 husky + commitlint（保留现有门禁）
2. 配置 `.commit-convention.json` 定义 commit 类型和作用域
3. 复制 `.trae/rules/`（Code Guardian 依赖）

#### 代码量估算

| 工具 | 行数 |
|------|:---:|
| `smart_commit`（diff 分析 + message 生成） | ~60 |
| `pre_commit_check`（调用 Code Guardian） | ~20 |
| `update_project_state` | ~30 |
| `generate_changelog` | ~40 |
| MCP 框架 + 错误处理 | ~40 |
| **合计** | **~190** |

### 3.6 Session Memory（P3，可选，文件共享，非 MCP）

**定位**：跨会话的轻量记忆。不是完整 RAG——只是记住"上次改了什么"和"需要注意什么"。

**为什么不用 MCP**：轻量键值对存储，文件系统足够。MCP 适合"调用工具"，不适合"存储状态"。

**与 v1 上下文压缩的区别**：v1 尝试压缩对话历史并保留规则，被 Trae 自带能力覆盖。v2 的目标更小更精准：只记住**跨会话需要传递的关键信息**。

| 文件 | 功能 |
|------|------|
| `.trae/session-memory.json` | 键值对存储 |

**使用场景**：
```
[会话 1]
你：帮我加一个题目导出功能
AI：（开始设计...）先确认一下现有的题目接口。
    （读取 .trae/session-memory.json）
    记忆提示：GET /api/questions 的 category 参数是模糊匹配（LIKE），不是精确匹配。
    好的，知道了。
    
（这个 "question_api_quirks" 是在三周前某次改 bug 时写入 session-memory.json 的）
```

---

## 四、与现有 Skill 体系的协同

### 4.1 Skill + MCP 不是替代，是增强

| Skill | 当前方式 | 加 MCP 后 |
|-------|---------|----------|
| **generate-with-constraints** | AI 自觉检查 P0/P1/P2 | `full_health_check` 一键验证 |
| **refactor-shit-mountain** | Phase 1 手动诊断（ESLint + check-file-size） | `run_eslint` + `check_file_size` 自动诊断 |
| **verify-refactor** | 分 4 Steps 手动执行 | `full_health_check` 一键完成 |
| **teach-interview-handbook** | AI 按文档讲解 | `project://interfaces` 获取最新接口契约 |
| **interview-drill** | AI 按题库出题 | `get_module_files` 了解项目结构后出针对性题目 |

### 4.2 期望的 Skill + MCP 协同流程（设计意图，待实施后验证）

> **注意**：以下为全部实施后的**期望交互流程**，不是当前已实现的功能。列在此处用于指导实施方向。

| 用户意图 | Skill 提供的指引 | Trae Solo（MCP） | Claude Code（MCP） | 期望效果 |
|---------|----------------|-----------------|-------------------|---------|
| "验证代码" / "check" | `verify-refactor`：告诉 AI 该分 4 Steps 验证 | Code Guardian `full_health_check`：一键执行 | Code Guardian `full_health_check`：一键执行 | 4 Steps 从"手动"变成"1 个工具调用" |
| "commit" / "提交" | `git-commit`：告诉 AI 该生成 conventional commit | Git Butler `smart_commit`：自动 diff + 生成 + 预检查 | Git Butler `smart_commit`：自动 diff + 生成 + 预检查 | AI 辅助提交 |
| "开始新任务" / "新会话" | 无现有 Skill | Project Context Resource：读取项目状态 | Project Context Resource：读取项目状态 | 新会话 1 步恢复上下文 |
| "重构" / "拆分" | `refactor-shit-mountain`：告诉 AI 先诊断再重构 | Code Guardian `detect_anti_patterns` + `check_file_size` | Code Guardian `detect_anti_patterns` + `check_file_size` | Phase 1 诊断从"手动跑脚本"变成"1 个工具调用" |
| "生成代码" / "写组件" | `generate-with-constraints`：告诉 AI 遵守 P0/P1/P2 | Code Guardian `validate_architecture` + `run_eslint` | Code Guardian `validate_architecture` + `run_eslint` | 生成后 AI 自检，发现违规立即修正 |
| "这个功能怎么实现的" | `teach-interview-handbook`：告诉 AI 从项目结构讲解 | Project Context `project://interfaces` | Project Context `project://interfaces` | 讲解基于最新接口契约 |

**设计原则**：
- Skill 管"什么时候做什么"（流程指引）——不变
- Trae Solo 和 Claude Code 均通过 MCP 调用工具（自动化执行）
- Workflow Bridge 和 Session Memory 通过文件系统共享状态
- 两者不是替代关系，Skill 在实施后**一个字都不需要改**

---

## 五、技术选型

### 5.1 为什么用 Node.js（不用 Python）

| 因素 | Node.js | Python |
|------|---------|--------|
| 与项目统一 | ✅ 项目就是 Node.js 生态 | ❌ 增加依赖 |
| MCP SDK 成熟度 | ✅ `@modelcontextprotocol/sdk` 官方支持 | ✅ FastMCP（社区维护） |
| ESLint 集成 | ✅ 原生 require('eslint') | ❌ 需要 subprocess |
| 跨平台 | ✅ npm 通用 | ⚠️ 需要 Python 环境 |
| 企业部署 | ✅ npm 包一键安装 | ⚠️ pip + venv 管理 |

### 5.2 MCP 传输方式

| 传输 | Code Guardian | Project Context | Workflow Bridge | Git Butler |
|------|:---:|:---:|:---:|:---:|
| stdio（本地） | ✅ | ✅ | ✅ | ✅ |
| HTTP+SSE（远程） | 🔮 | 🔮 | 🔮 | 🔮 |

开发阶段用 stdio。企业级部署时同一套代码可以切 HTTP+SSE 模式，连接远程团队共享的 MCP 实例。

### 5.3 不做什么

| 不做 | 理由 |
|------|------|
| 把 MCP 写进面试宝典的业务代码 | MCP 是给 AI 用的工具，不是给用户用的 API |
| 引入向量数据库/Embedding | 你的场景不需要语义检索，结构化规则足够 |
| 做 Agent 编排 | 你的两个 AI 工具本来就是 Agent，不需要再编排 |
| 自建 context7/brave-search | 社区已有成熟版本，直接用社区版即可 |

---

## 六、实施优先级

| 优先级 | MCP Server | 预计代码量 | 立即可用 | 简历价值 | 跨项目复用 | 依赖 |
|:---:|-----------|:---:|:---:|:---:|:---:|------|
| **P0** | Code Guardian | ~320 行 | ✅ | ⭐⭐⭐⭐⭐ | ✅ 极高 | 复用 check-file-size.js + eslint-plugin-architecture |
| **P1** | Project Context | ~100 行 | ✅ | ⭐⭐⭐ | ✅ 高 | 无 |
| **P1** | Workflow Bridge | ~120 行 | ✅ | ⭐⭐⭐⭐ | ✅ 极高 | 无 |
| **P2** | Git Butler | ~190 行 | ✅ | ⭐⭐⭐ | ✅ 高 | 依赖 Code Guardian + husky |
| **P3** | Session Memory | ~60 行 | ✅ | ⭐⭐ | ✅ 中 | 无 |

### 最小验证步骤（先验证 MCP 通路，再写功能）

**在写任何 MCP Server 代码之前，先用一个最小原型验证两端 MCP 通路是否正常：**

```
Step 1: 编写一个最小 MCP Server（10行）
  → 只有 1 个 Tool: echo(msg) → 返回 msg

Step 2: 在 Trae Solo 中验证
  → 配置到 .trae/mcp.json
  → 说："帮我调用 echo 工具，msg 是 hello"
  → 预期：AI 成功调用并返回 "hello"
  → 状态：✅ 已通过（你的实测截图已验证）

Step 3: 在 Claude Code 中验证
  → 配置到 settings.json 的 mcpServers 字段（独立配置，不共享 Trae 的配置）
  → 说："帮我调用 echo 工具，msg 是 hello"
  → 预期：AI 成功调用并返回 "hello"
  → 状态：⏳ 待验证（Claude Code 官方表示支持，需独立配置）

Step 4: 确认两端通路正常后，再开始写 Code Guardian
```

**这个步骤的价值**：如果 MCP 通路不通，所有 MCP Server 都是废代码。10 行的原型比 320 行的 Code Guardian 调试成本低 30 倍。

**Claude Code 配置参考**（来自 Claude Code 官方建议）：
```json
// settings.json
{
  "mcpServers": {
    "code-guardian": {
      "type": "stdio",
      "command": "node",
      "args": ["D:\\path\\to\\code-guardian\\index.js"]
    }
  }
}
```

### 实施风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:---:|------|---------|
| Claude Code 的 MCP 配置未经验证 | 中 | 高：Code Guardian/Git Butler 在 Claude Code 中不可用 | **最小验证步骤 Step 3**：先在 Claude Code 中验证 echo-server 通路；如果失败，再考虑 CLI 降级方案 |
| Trae Solo 的 MCP 支持不完整 | 低 | 高：所有 MCP 不可用 | echo-server 已验证通过（你的实测截图） |
| ESLint 程序化 API 调用性能问题 | 中 | 低：校验变慢 | `run_eslint` 只在 AI 主动调用时执行，不是每次编辑都触发 |
| `validate_architecture` 误报 | 中 | 低：AI 被误导 | 提供 `--verbose` 模式输出具体命中行号，方便人工判断 |
| Code Guardian 行数超标 | 高 | 中：违反自身规则 | 每个 Tool 独立文件，`detect_anti_patterns` 拆成 6 个子模块 |
| Git Butler 与 husky 的 pre-commit 双重执行 | 低 | 低：检查跑两遍 | 设计上 Git Butler 在 `git commit` 之前执行，husky 在 `git commit` 时触发，不冲突；Git Butler 的结果可缓存供 husky 复用 |

### MCP Server 测试策略

| 测试层级 | 覆盖范围 | 工具 |
|---------|---------|------|
| **单元测试** | 每个 Tool 的独立逻辑（如 `detect_anti_patterns` 的 6 种模式各写一个测试用例） | Node.js 内置 `node:test` |
| **集成测试** | Code Guardian 的 `full_health_check` 在真实项目上运行 | 用 `interview-handbook` 作为测试靶场 |
| **MCP 协议测试** | 验证 JSON-RPC 请求/响应格式正确 | `@anthropic/mcp-inspector`（MCP 官方可视化调试工具） |
| **端到端测试** | 在 Trae Solo / Claude Code 中实际调用验证 | 最小验证步骤的 Step 2-3 |

**测试靶场设计**：创建一个 `test-fixtures/` 目录，包含故意违规的代码文件：

```
test-fixtures/
├── oversized-controller.js    # 151行，触发 check_file_size 告警
├── view-with-fetch.vue         # 视图层直接 fetch，触发 validate_architecture 告警
├── no-cleanup-timer.js         # setInterval 未清理，触发 detect_anti_patterns 告警
├── no-comment-function.js      # 函数无注释，触发 check_comment_compliance 告警
└── clean-code.js               # 完全合规的代码，验证不误报
```

### MVP 实施建议

**第一周**：Code Guardian（MCP Server，~320 行）
  - 先跑最小验证步骤（echo-server 确认两端 MCP 通路）
  - 实现 MCP Server 核心逻辑
  - 在 Trae Solo 中配置 `.trae/mcp.json` 验证
  - 在 Claude Code 中配置 `settings.json` 验证（Step 3）
  - 用 test-fixtures 验证输出

**第二周**：Project Context（MCP Resource，~100 行）+ Workflow Bridge（文件共享，~120 行）
  - Project Context：两端分别配置 MCP，AI 快速获取项目上下文
  - Workflow Bridge：Trae Solo 产出计划 → Claude Code 读取执行

**第三周**：Git Butler（MCP Tool，~190 行）
  - 依赖 Code Guardian 已完成
  - 在两端分别验证 `smart_commit` + `pre_commit_check` 流程

---

## 七、为什么这个方案比 v1 好

| 维度 | v1（RAG/MCP 作用于项目） | v2（MCP 作用于编码工作流） |
|------|--------------------------|---------------------------|
| **会动项目代码吗** | 会，需要新增 RAG 路由/Controller/前端对接 | 不会，MCP 是独立进程 |
| **影响用户体验吗** | 会，SSE 打字速度受影响 | 不会，用户无感知 |
| **跨项目可复用吗** | 不能，每个项目 RAG 数据不同 | 能，复制 `.trae/rules/` 即可 |
| **增加面试复习负担吗** | 会增加（需要理解 RAG 流水线） | 不会（MCP 是工具层，不需要进简历技术栈） |
| **企业级能用吗** | 需要大改（FAISS 换企业向量库） | 能（MCP 协议本身就是企业标准） |
| **解决实际痛点吗** | 部分解决（AI 对话增强是加分项） | 直接解决（规则遗忘 + 上下文丢失 + 重复验证） |

---

## 八、参考资料

1. CSDN: "MCP协议完全指南：2026年AI Agent开发的通用标准" — MCP 架构、三大原语、完整代码
2. 掘金: "终于不用担心 MCP 吃掉一半上下文了" — 社区 MCP Server 选择与性能优化经验
3. CSDN: "GitHub MCP Server代码搜索：智能代码发现引擎" — GitHub MCP 功能分析
4. 项目现有: `.trae/rules/` 6 条规则 + `.trae/skills/` 5 个 Skill + `PROJECT_STATE.md`
5. 项目现有: `.trae/documents/RAG-MCP应用分析.md` — v1 方案（已废弃方向）
6. MCP 官方: `modelcontextprotocol.io` — 协议规范、SDK 文档
