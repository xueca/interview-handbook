# 我造了个 MCP 工具，就为了不让 AI 乱写代码

> 用 AI 写代码半年了，我发现一个规律：**你不给 AI 定规矩，它就给你造屎山。**

---

## 起因

事情是这样的。

我用 AI 写代码大概有半年了，最开始觉得这东西真香，什么都能写。但后来发现一个问题——**AI 生成的代码质量参差不齐**。

有时候它写得挺好，架构清晰、注释完整。有时候它就开始放飞自我了：

- 好好的 Vue 组件，它直接在 `.vue` 文件里写 fetch
- async 函数写了，try-catch 忘了
- setInterval 一设，cleanup 是什么？不知道
- 一个文件写 500 行，一个函数写 100 行
- 模块顶层的 `let currentStream = null`，多线程都不带这么玩的

你说它错吧，功能确实能跑。你说它对，这代码谁敢上线？

一开始我觉得，给 AI 写好 prompt 就行了。试了几天发现，**AI 记不住这么长的规矩**。它写着写着就把你定的规则忘了，该踩的坑一个不落。

我就想：能不能在 AI 写代码的时候，实时给它检查？像 ESLint 那样，但不只检查语法，还要检查架构分层、反模式、文件行数这些？

这个想法折磨了我两周，最后我决定——自己造一个。

---

## 为什么是 MCP？

如果你还没接触过 MCP，简单说就是：**MCP（Model Context Protocol）是 AI 编码助手的「USB 接口」**。

以前你想让 AI 执行一个自定义操作，得写 CLI 脚本，通过 prompt 告诉 AI 去运行。MCP 出现之后，AI 可以直接调用你注册的 Tool，就像调内置功能一样自然。

**Code Guardian 就是借助这个机制，让 AI 在修改代码时主动调用检查工具，而不是靠它自觉遵守规则。**

```
AI 改了代码 → 自动调 Code Guardian → 发现问题 → 返回给 AI → AI 修复
```

整个过程对用户来说是无感的，你只看到 AI 先检查、再修改、最后告诉你"改好了，检查通过"。

---

## 6 个检查工具

我做了 6 个 MCP Tool，覆盖 AI 写代码最容易出问题的几个方面：

### 1. check_file_size — 文件不能太长

这个最简单，但也是最实用的。AI 特别喜欢把所有逻辑塞一个文件。500 行的 Vue 组件？它觉得很正常。但我受不了。

配置方式：

```json
{
  "fileSizeLimits": {
    "**/controllers/**/*.js": 150,
    "**/*.vue": 200,
    "**/*.js": 150
  }
}
```

文件路径通过 glob 模式从上到下匹配，第一个命中生效。

### 2. run_eslint — 语法规范检查

其实就是套了个壳调用 ESLint。但有个坑：ESLint 装在用户项目里不在 Code Guardian 的 node_modules 里。这问题搞了我一下午。

解决方式：

```js
const Module = require('module');
Module.globalPaths.push(path.join(projectRoot, 'node_modules'));
```

然后把 ESLint 设为 peerDependencies 并标记 optional，用户项目装了就用，没装就跳过。

### 3. validate_architecture — 架构分层不能乱

项目有个规矩：**.vue 不能直接写 fetch**，数据请求必须走 composable → api 层。

AI 做不到自觉遵守。所以写了个工具，逐行扫描目标文件：

```js
// 找到 violation 的场景：
// views/*.vue 里出现 fetch/axios/EventSource → 报错
// composables/*.js 里 import 了 views/ 目录 → 报错
// controllers/*.js 里 import 了 views/ → 报错
```

规则可配置：

```json
{
  "architecture": {
    "layers": [
      { "name": "views", "path": "**/*.vue", "forbidden": ["fetch", "axios", "EventSource"] },
      { "name": "composables", "path": "**/composables/**/*.js", "forbiddenImports": ["views/"] },
      { "name": "backend", "path": "**/controllers/**/*.js", "forbiddenImports": ["views/", "stores/"] }
    ]
  }
}
```

### 4. detect_anti_patterns — 6 种反模式扫描

这是最多坑的模块。我总结了 AI 写代码最常犯的 6 个毛病：

| 反模式 | 严重程度 | AI 犯的频率 |
|--------|---------|------------|
| .vue 里直接 fetch/axios | P0 | 非常高 |
| async 函数没有 try-catch | P0 | 高 |
| setInterval/SSE 不清理 | P0 | 中 |
| 模块级状态变量 | P1 | 高 |
| 组件里写超过 3 行的数据转换 | P1 | 中 |
| 重复代码块 | P2 | 低 |

每种检测可以独立开关，不想要的就 `false`。

### 5. check_comment_compliance — 注释检查

我要求每个文件顶部写注释描述功能和数据流：

```js
// 文件功能: JWT 认证中间件 | 数据流: req.headers.authorization → jwt.verify → req.user
```

AI 经常不写，写了也是敷衍。这个工具专门抓漏写的注释。

### 6. full_health_check — 一键全检查

把上面 5 个合并成一个。用 Promise.all 并行跑，省时间。

返回格式：

```json
{
  "summary": {
    "fileSize": "✅",
    "eslint": "✅",
    "architecture": "❌",
    "antiPatterns": "❌",
    "comments": "✅"
  },
  "details": { ... }
}
```

AI 看到 ❌ 就会自动去修。

---

## 踩坑实录 — Windows 上的 MCP Server 开发

这部分是我最想分享的。开发过程中遇到的坑，可能比你想象的多。

### 坑1：Windows 管道 \r\n 转换

MCP 通过 stdio 传输 JSON-RPC 消息。Windows 上 Node.js 的 stdout 默认是**文本模式**，自动把 `\n` 转 `\r\n`。

导致的结果：MCP 握手失败，消息被截断，查了一下午才定位到。

解决：

```js
if (process.platform === 'win32') {
  process.stdout._handle?.setBlocking(true);
}
```

### 坑2：项目路径解析

一开始我用的 `__dirname` 来定位项目根目录。开源之后发现，别人通过 npm install 装到 node_modules 里，`__dirname` 指向的是 MCP Server 自己的目录，不是用户项目。

解决：用 `--project-root` 参数显式传入。

### 坑3：Glob 模式的正则占位符污染

把 `**/` 转成正则 `(?:.*/)?`，然后继续替换 `*` → `[^/\\]*`，结果之前替换好的也污染了。

解决：

```js
let regex = pattern
  .replace(/\*\*\/|\/\*\*/g, '{{GLOBSTAR}}')   // 先保护起来
  .replace(/\*/g, '[^/\\\\]*')                  // 替换普通 *
  .replace(/\./g, '\\.')
  .replace(/\{\{GLOBSTAR\}\}/g, '(?:.*/)?');    // 最后还原
```

### 坑4：node:test 并行跑测试，夹具冲突

Node.js 自带的 `node:test` 默认并行执行测试。所有测试用例共享同一个 `__fixtures__` 目录，一个测试删了文件另一个还在读，直接 ENOENT。

解决：每个测试用例用 `fs.mkdtempSync` 创建独立临时目录。

### 坑5：JSON-RPC 消息边界

MCP 用 `\n` 分隔消息，但 JSON 本身也可能包含换行符。

解决：用 `readline` 逐行读，别自己拼缓冲。

---

## 四层防御体系

工具做好了，但 AI 不一定每次都会主动调用。所以设计了四层兜底：

```
Layer 1: MCP Tool（AI 主动调用）
    ↓ AI 忘了怎么办？
Layer 2: after-write Hook（文件写入后自动触发）
    ↓ 还是漏了？
Layer 3: /review Command（用户手动触发）
    ↓ 提交前最后一道？
Layer 4: Husky pre-commit（git commit 前检查）
```

**Layer 1** 是最核心的层，AI 修改代码时主动调用。
**Layer 2** 是兜底，AI 忘了调的话，文件写入后自动触发，检查不通过直接 `process.exit(1)`。
**Layer 3** 允许用户随时手动检查。
**Layer 4** 是最后防线，提交前确保所有文件通过。

---

## 配置驱动

所有检查参数（行数上限、分层规则、反模式开关）都从 `.code-guardian.json` 读取，不硬编码。**每个项目可以根据自己的编码标准自定义**。

完整配置长这样：

```json
{
  "version": "1.0",
  "fileSizeLimits": {
    "**/*.vue": 200,
    "**/*.js": 150
  },
  "architecture": { "layers": [...] },
  "antiPatterns": { ... },
  "eslint": { "configPath": "..." },
  "commentStandard": { "fileHeaderRequired": true }
}
```

---

## 怎么用

### 安装

```bash
npm install --save-dev github:xueca/code-guardian
```

### 创建配置文件 `.code-guardian.json`

```json
{
  "version": "1.0",
  "fileSizeLimits": {
    "**/*.vue": 200,
    "**/*.js": 150
  }
}
```

### 配置 MCP 客户端

**Trae**（`.trae/mcp.json`）：

```json
{
  "mcpServers": {
    "code-guardian": {
      "command": "node",
      "args": [
        "/absolute/path/to/node_modules/code-guardian/index.js",
        "--project-root",
        "/absolute/path/to/project"
      ]
    }
  }
}
```

**Claude Code**（`.claude/settings.json`）：

```json
{
  "mcpServers": {
    "code-guardian": {
      "command": "node",
      "args": ["./node_modules/code-guardian/index.js", "--project-root", "."]
    }
  }
}
```

**Cursor / Windsurf**：同样在 MCP 配置路径加就行。

### 在 AI 规则文件中强制调用

在 `.trae/rules/` 或 `.claude/rules/` 里加一条：

```
修改任何 .vue / .js 文件时：
1. 修改前：调用 full_health_check 了解当前状态
2. 修改中：调用 check_file_size 防止超行
3. 修改后：调用 full_health_check 验证无新问题
4. 如果 ok: false，先修复再报告完成
```

---

## 写在最后

说实话，做这个工具花了不少时间。核心逻辑其实不难，难的是**想清楚 AI 到底会在哪些地方犯错**，以及**怎么让它自觉地遵守规则**。

MCP 协议让这一切成为可能。以前想让 AI 做代码检查，你得写个 CLI 再告诉它去跑。现在 AI 直接调 Tool，检查结果回来了它会自己改。

如果你也被 AI 写出来的屎山折磨过，可以试试 Code Guardian。

代码开源在 GitHub：**[xueca/code-guardian](https://github.com/xueca/code-guardian)**

欢迎 Star、Issue、PR。

---

> 最后留一个问题：**你有没有遇到过 AI 写出的让你意想不到的骚操作？** 评论区见。