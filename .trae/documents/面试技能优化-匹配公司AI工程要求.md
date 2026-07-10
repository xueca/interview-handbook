# 面试技能优化计划：匹配目标公司AI工程要求

> 目标：优化 interview-drill 和 teach-interview-handbook 两个 Skill，新增AI工程能力题目、Node.js基础题目和教学模式，匹配目标公司要求。

---

## 一、背景分析

### 目标公司要求（从截图提取）

| 编号 | 要求 | 用户项目匹配度 |
|------|------|---------------|
| 1 | 精通 Python 或 Node.js | ⚠️ 用了Node.js（Express后端）但基础薄弱 |
| 2 | GPT/Claude/DeepSeek API 调用经验 | ✅ DeepSeek API + SSE流式 |
| 3 | Agent架构/多Agent协作/工作流编排/Prompt结构化设计 | ✅ MCP Server + 双AI工作流 + Rules/Skills体系 |
| 4 | AST/静态分析/Lint规则 | ✅ Code Guardian（6项检查工具） |
| 5 | 能设计自动测试生成系统 | ❌ 缺口，只有手写测试 |

### 用户自评
- "我对Node.js也不懂" — 虽然用了Express写后端，但Node.js核心原理（事件循环/流/模块系统/中间件机制）没系统学过
- 需要新增Node.js基础题组，用项目真实代码作为教学案例

### 现有Skill问题

- interview-drill：13题3组（SSE/架构/延伸），无AI工程题目，无Node.js基础题目，无教学模式
- teach-interview-handbook：9模块，无AI工程模块，无Node.js基础模块
- 两个SKILL.md都已接近200行上限

### 新增题目与真实代码映射

| 题号 | 覆盖要求 | 真实代码素材 |
|------|---------|------------|
| Q14 | Agent架构 | `code-guardian/index.js`：MCP Server注册6个Tool |
| Q15 | 多Agent协作 | `workflow-bridge/bridge.js` + 双AI工作流3个断点 |
| Q16 | 工作流编排+Prompt结构化 | `.trae/rules/`7个规则 + `.trae/skills/`6个技能 |
| Q17 | 静态分析+Lint | `validate_architecture.js`正则提取import + `knowledge/06`误报案例 |
| Q18 | AST | `function_body.js`大括号计数伪AST |
| Q19 | 自动测试生成 | `__tests__/`测试模式 + `.code-guardian.json`配置驱动 |
| Q20 | Node.js事件循环 | `app.js`：Express中间件链 + `deepseekService.js`：axios流式响应 |
| Q21 | Node.js流(Stream) | `deepseekService.js`：responseType:'stream' + `relaySSE`的upstream.on('data') |
| Q22 | Node.js模块系统 | `app.js`：require/module.exports + `data/index.js`：CommonJS导出 |
| Q23 | Express中间件机制 | `app.js`：自定义JSON parser + next()链 + 错误处理 |
| Q24 | Node.js文件系统 | `data/index.js`：fs.readFileSync/writeFileSync同步读写 + 并发问题 |

---

## 二、架构设计：子文件拆分

```
.trae/skills/interview-drill/
├── SKILL.md              # 主文件: 角色+原则+模式+流程+教学模式 (目标~145行)
├── questions.md          # 题库: 5组(A/B/C/D/E)共24题 (目标~115行)
└── answers.md            # 答案锚点: Q1-Q24参考答案 (目标~155行)

.trae/skills/teach-interview-handbook/
├── SKILL.md              # 主文件: 角色+框架+指令+原则 (目标~130行)
└── modules.md            # 模块总览+知识映射+AI工程+Node.js模块 (目标~140行)

.trae/knowledge/
├── 12-AI工程能力-教学要点.md  # 新增: Code Guardian/双AI/静态分析教学素材
└── 13-Node.js基础-教学要点.md  # 新增: 事件循环/流/模块系统/中间件/文件系统
```

数据流：
```
用户说「考我AI工程」
  → SKILL.md → 读取 questions.md 获取D组题目 → 用户答错
  → 教学模式启动(思路→方案→实现→追问) → 需要时读取 answers.md

用户说「教我Code Guardian」
  → SKILL.md → 读取 modules.md 找到模块10
  → 映射到 knowledge/12 → 按五段式教学
```

---

## 三、实施步骤

### 步骤1：创建 `interview-drill/questions.md`（题库子文件）

**操作**：新建文件

**内容**：
- 从SKILL.md原样迁出A/B/C三组13题（不改文本）
- 新增D组6题（AI工程能力）：

| 编号 | 问题 |
|------|------|
| Q14 | 「Code Guardian 是 MCP Server。MCP 和普通 REST API 有什么区别？MCP 三大原语分别是什么？你的 index.js 用的是哪个原语？」 |
| Q14-追问 | 「如果要暴露项目规则让 AI 读取（不是执行），该用哪个原语？为什么不用 REST？」 |
| Q15 | 「你的 Trae Solo + Claude Code 双 AI 工作流，两个 AI 怎么分工？上下文怎么传递？三个断点哪个最危险？」 |
| Q15-追问 | 「Workflow Bridge 为什么用文件而不是 MCP 来传递状态？」 |
| Q16 | 「.trae/rules/ 和 .trae/skills/ 本质上是在做什么？跟 Prompt 工程什么关系？rules 和 skills 的边界在哪？」 |
| Q16-追问 | 「'文件不超过200行'应该放 rules 还是 skills？为什么？」 |
| Q17 | 「validate_architecture 用正则提取 import 检测架构违规。为什么不直接用 AST？正则方案出了什么误报？怎么解决的？」 |
| Q17-追问 | 「如果用 acorn 重写 import 检测，核心思路是什么？比正则多几行代码？」 |
| Q18 | 「bare_async_detector 用大括号计数提取函数体判断 try-catch。这算 AST 吗？遇到字符串里的 { 会怎样？」 |
| Q18-追问 | 「给你一个具体例子：`const s = "a{b}c"` 会怎样？」 |
| Q19 | 「Code Guardian 的 __tests__ 是怎么组织的？如果让你设计自动测试生成系统，你会怎么做？」 |
| Q19-追问 | 「makeTempDir→createFixture→assert→cleanup 模式能自动化吗？怎么从源码自动推导 fixture？」 |

- 新增E组5题（Node.js基础，用项目真实代码作为案例）：

| 编号 | 问题 |
|------|------|
| Q20 | 「你后端 app.js 里 app.use(cors()) 之后又 app.use(自定义JSON parser)，再到路由。Express 的中间件机制是怎样的？next() 不调会怎样？如果中间件里抛异常，后面的中间件会执行吗？」 |
| Q20-追问 | 「你自定义 JSON parser 里 res.status(400).json() 之后为什么还要 return？不 return 会怎样？」 |
| Q21 | 「你的 deepseekService.js 用 axios responseType:'stream' 拿到 DeepSeek 的流式响应。这个 stream 和 Node.js 的 ReadableStream 什么关系？upstream.on('data') 里的 data 是什么类型？」 |
| Q21-追问 | 「你的 relaySSE 里 upstream.on('end') 和 upstream.on('error') 都调 endStream()。如果两个事件同时触发，endStream 会执行两次吗？你怎么防的？」 |
| Q22 | 「你项目全部用 require/module.exports（CommonJS）。require 的加载过程是怎样的？模块会被执行几次？为什么 require 有缓存？ESM import 和 CommonJS require 有什么区别？」 |
| Q22-追问 | 「你 app.js 第一行 require('dotenv').config()，这一行执行时 process.env 还没有 PORT。但第15行 const port = process.env.PORT 能拿到值。为什么？」 |
| Q23 | 「你的 data/index.js 用 fs.readFileSync 同步读取 JSON 文件。为什么不用 fs.readFile 异步版？同步读取会阻塞什么？在高并发场景下会出什么问题？」 |
| Q23-追问 | 「如果两个请求同时调用 writeJSON 写同一个文件，会发生什么？你代码里有没有做并发控制？怎么解决？」 |
| Q24 | 「Node.js 的事件循环有哪几个阶段？你的 aiController.js 里 `await callDeepSeek()` 被 await 暂停后，Node.js 在等 DeepSeek 响应时在干什么？能不能同时处理其他用户的请求？」 |
| Q24-追问 | 「setTimeout、setImmediate、process.nextTick 的执行顺序是什么？在你的项目里有用到这几个吗？」 |

### 步骤2：创建 `interview-drill/answers.md`（答案锚点子文件）

**操作**：新建文件

**内容**：
- 从SKILL.md原样迁出Q1-Q13答案锚点
- 新增Q14-Q19答案（每题4-5要点，引用真实代码位置）：

```
### Q14（MCP vs REST API）
- MCP是AI调用工具的标准协议，REST API面向人/应用
- 三大原语：Tools(可执行函数)、Resources(可读数据)、Prompts(模板)
- index.js用server.tool()注册6个Tool → 属于Tools原语
- 暴露规则让AI读取 → 应该用Resources原语
- 不用REST：AI需自动发现工具+结构化输入输出+跨AI工具通用

### Q15（双AI工作流）
- Trae Solo：架构设计/全局规划 → 产出plan.md
- Claude Code：代码实现/Bug修复 → 读取current-plan.json
- Workflow Bridge：文件系统共享状态(bridge.js提供CLI)
- 三断点：上下文丢失(最危险)、Skills是文本指令、规则靠AI自觉
- 上下文丢失最危险：新会话完全不知道项目结构

### Q16（rules + skills本质）
- rules=硬约束(架构契约/文件限制)，skills=流程指引(怎么做)
- 本质：结构化Prompt，固化成文件而非依赖对话记忆
- rules(说)→skills(做)→hooks(查)=三层约束体系
- "文件不超过200行"→放rules(约束不是流程)

### Q17（正则 vs AST）
- 正则方案：extractImportStatements提取import路径
- 误报根因：正则扫描全文，字符串字面量中的'composables/'被误判
- 解决：先提取import语句再匹配，非全文test
- AST方案：espree解析→只检查ImportDeclaration节点
- 取舍：正则零依赖够用，AST更准但增加依赖

### Q18（大括号计数伪AST）
- 不算AST，是伪AST——基于大括号计数的文本匹配
- bug：字符串中的{被错误计数(const s="a{b}c"会提前结束)
- 模板字符串中的${}也会错误计数
- 真正AST：espree解析成语法树，精确识别StringLiteral节点

### Q19（自动测试生成系统）
- 现有测试：node:test，每个Tool一个测试文件
- 模式：makeTempDir→createFixture→调用→断言→cleanup
- 自动生成设计：①解析函数签名→生成骨架 ②基于配置→生成边界用例 ③正例+反例
- 这是当前缺口：只有手写测试，没有自动生成

### Q20（Express中间件机制）
- 中间件是函数链：req→res→next，每个app.use注册一个环节
- next()不调 → 请求挂起，客户端永远收不到响应
- 抛异常 → 如果没有错误处理中间件(4参数)，Express返回500
- app.js的自定义JSON parser：return res.status(400).json()后必须return
- 不return → 继续执行next()，res已被发送→headers already sent报错
- 关键代码：app.js第23-42行，return在catch块中

### Q21（Node.js流）
- axios responseType:'stream' 返回的是Node.js Readable流（http.IncomingMessage）
- 和浏览器ReadableStream不同：Node.js流基于EventEmitter，浏览器流基于Promise+reader
- upstream.on('data')的data是Buffer类型，需要.toString()转字符串
- endStream防重复：ended布尔标志，第48行if(ended)return
- Node.js事件是同步的：end和error不会"同时"触发，但可能连续触发

### Q22（CommonJS模块系统）
- require加载过程：①解析路径 ②读取文件 ③包裹函数 ④执行 ⑤缓存 ⑥返回module.exports
- 模块只执行一次：require有缓存(module._cache)，第二次require直接返回缓存
- ESM vs CommonJS：ESM静态分析(import编译时确定)、CommonJS动态(require运行时)
- ESM export是引用(-live binding)，CommonJS module.exports是值拷贝
- dotenv.config()同步执行→写入process.env→后续require的模块能读到

### Q23（fs同步 vs 异步）
- readFileSync阻塞事件循环 → 在等磁盘IO时无法处理其他请求
- 项目用同步：①JSON文件小(几KB) ②单用户场景 ③简单直接
- 高并发问题：事件循环被阻塞 → 所有请求排队等待
- writeJSON并发问题：read→modify→write无锁 → 并发写入会丢数据
- 解决：①写队列(serialize writes) ②文件锁 ③换SQLite(WAL模式)

### Q24（事件循环）
- 6个阶段：timers→pending callbacks→idle/prepare→poll→check→close callbacks
- await callDeepSeek() → axios发起HTTP请求 → 注册I/O回调 → 函数挂起
- 等待期间事件循环继续 → 可以处理其他用户的请求（非阻塞I/O）
- 执行顺序：process.nextTick > 微任务(Promise) > setTimeout > setImmediate
- 项目中用到：aiController的async/await(微任务)、relaySSE的upstream.on('data')(I/O回调)
```

### 步骤3：改造 `interview-drill/SKILL.md`（主文件瘦身+教学模式）

**操作**：修改现有文件

**改动点**：

1. **Frontmatter**：description新增教学模式和D组E组
2. **删除题库区块**（原31-62行）→ 替换为子文件引用表
3. **Drill模式表**：新增D组、E组和教学模式行
```markdown
| 模式 | 抽题范围 | 默认数量 | 触发词 |
|------|---------|---------|--------|
| SSE 专题 | Q1~Q6+Q11（7题） | 3题 | 「考我 SSE」 |
| 架构+踩坑 | Q7~Q10（4题） | 2题 | 「考我架构」 |
| 综合延伸 | Q12~Q13（2题） | 全抽 | 「考我安全」 |
| AI工程能力 | Q14~Q19（6题） | 3题 | 「考我AI工程」「考我MCP」 |
| Node.js基础 | Q20~Q24（5题） | 3题 | 「考我Node」「考我后端」 |
| 全真模拟 | 全部24题 | 随机5题 | 「全真模拟」「来真的」 |
| 教学模式 | 任意组 | 用户选 | 「考我并教我」 |
```
4. **核心原则新增第6条**：答错即教——答错时不只给答案，启动教学模式引导思考
5. **执行流程新增Step 1.5**：加载题库（读取questions.md和answers.md）
6. **执行流程新增Step 3.5**：教学模式

Step 3.5 教学模式框架：
```
当评价为❌需要改进时，不直接公布答案，按以下框架教学：

思路（引导思考）
> "这个问题本质是在问[xxx]。你先想想[yyy]会怎样？"
方案（给出选择）
> "有两种方案：A([简述])... B([简述])... 你的项目用的是哪个？"
实现（结合项目代码）
> "看[文件]第[N]行，就是这么做的：[关键逻辑]。"
追问（确认理解）
> "那如果[变体场景]，你会怎么处理？"
```

7. **边界规则新增**：教学模式每步1-2句，不展开长篇大论；用户可选跳过教学直接看答案

**预期行数**：~145行（安全余量）

### 步骤4：创建 `knowledge/12-AI工程能力-教学要点.md`

**操作**：新建文件

**内容**：3个模块的教学要点，遵循knowledge/10的格式：

```
## 模块10：Code Guardian MCP Server (⭐⭐⭐⭐⭐)
- 设计思路：MCP vs REST、三大原语、Agent vs 工具
- 核心实现：index.js的Server实例+ListTools+CallTool、stdio传输
- 面试模拟：MCP和REST区别、Code Guardian算Agent吗

## 模块11：双AI工作流编排 (⭐⭐⭐⭐)
- 设计思路：为什么两个AI、Bridge为什么用文件、三个断点
- 核心实现：bridge.js三命令、current-plan.json schema
- 面试模拟：两个AI怎么协作、Bridge为什么不做MCP

## 模块12：静态分析与自动测试 (⭐⭐⭐⭐)
- 设计思路：正则vs AST选型、资源泄露配对策略、自动测试生成（缺口）
- 核心实现：function_body.js伪AST、validate_architecture.js、__tests__模式
- 踩坑记录：引用knowledge/06的3个问题
- 面试模拟：正则误报根因、自动测试生成系统设计
```

### 步骤4.5：创建 `knowledge/13-Node.js基础-教学要点.md`

**操作**：新建文件

**内容**：5个模块的Node.js基础教学要点，用项目真实代码作为案例：

```
## 模块13：Express中间件机制 (⭐⭐⭐⭐)
### 设计思路
- 中间件本质：函数链(app.use注册的函数，按顺序执行)
- next()的作用：把控制权交给下一个中间件
- 不调next()：请求挂起，客户端永远等不到响应
- 错误处理：4参数中间件(err,req,res,next)，需放在最后

### 核心实现（结合项目代码）
- app.js第17-51行：cors → 自定义JSON parser → 路由注册
- app.js第23-42行：自定义JSON parser的return逻辑
- 如果JSON.parse失败 → res.status(400).json() → 必须return
- 不return → 继续next() → res已发送 → "headers already sent"报错

### 面试模拟
- Q: "Express中间件机制是什么？" → 函数链 + next()
- Q: "你的JSON parser为什么自定义而不用express.json()？" → 调试需求+错误信息更友好
- 追问: "res.json()之后不return会怎样？" → headers already sent

## 模块14：Node.js流(Stream) (⭐⭐⭐⭐⭐)
### 设计思路
- Node.js流基于EventEmitter(data/end/error事件)
- 浏览器ReadableStream基于Promise+reader.read()
- 区别：Node.js流是推模式(自动触发data事件)，浏览器是拉模式(手动read)
- Buffer：Node.js二进制数据容器，类似Uint8Array

### 核心实现（结合项目代码）
- deepseekService.js第22行：responseType:'stream'
- relaySSE第44-50行：upstream.on('data')接收Buffer
- relaySSE第48-50行：ended标志防重复关闭(end和error可能连续触发)
- 前后端流的对称性：后端Node.js流→HTTP→浏览器ReadableStream

### 面试模拟
- Q: "Node.js流和浏览器流有什么区别？" → EventEmitter vs Promise+reader
- Q: "upstream.on('data')的data是什么类型？" → Buffer
- 追问: "end和error同时触发怎么办？" → ended标志防重复

## 模块15：CommonJS模块系统 (⭐⭐⭐)
### 设计思路
- require加载过程：路径解析→读取→包裹(module.exports/exports/require/module/__filename/__dirname)→执行→缓存
- 模块只执行一次：require缓存(Module._cache)
- CommonJS vs ESM：CommonJS动态运行时、ESM静态编译时
- CommonJS值拷贝 vs ESM引用绑定(live binding)

### 核心实现（结合项目代码）
- app.js第2-10行：require加载dotenv/cors/express/路由模块
- data/index.js第37行：module.exports导出readJSON/writeJSON
- app.js第2行require('dotenv').config() → 同步写入process.env → 第15行能读到PORT

### 面试模拟
- Q: "require的加载过程？" → 6步：解析→读取→包裹→执行→缓存→返回
- Q: "为什么require有缓存？" → 避免重复执行+性能
- 追问: "require和import有什么区别？" → 动态vs静态、值拷贝vs引用

## 模块16：Node.js文件系统 (⭐⭐⭐)
### 设计思路
- fs同步 vs 异步：readFileSync阻塞事件循环，readFile不阻塞
- 同步适用场景：启动时加载配置(dotenv)、小文件、单用户
- 异步适用场景：高并发、大文件、不阻塞请求处理
- 并发写入问题：read→modify→write无锁→数据丢失

### 核心实现（结合项目代码）
- data/index.js第19行：fs.readFileSync同步读取
- data/index.js第35行：fs.writeFileSync同步写入
- 为什么用同步：JSON文件小(几KB)、单用户、简单
- 并发问题：两个请求同时writeJSON→最后一次写入覆盖前一次

### 面试模拟
- Q: "为什么用readFileSync不用readFile？" → 小文件+单用户+简单
- Q: "高并发下会出什么问题？" → 事件循环阻塞+并发写入丢数据
- 追问: "怎么解决并发写入？" → 写队列/文件锁/SQLite

## 模块17：Node.js事件循环 (⭐⭐⭐⭐⭐)
### 设计思路
- 6个阶段：timers→pending callbacks→idle/prepare→poll→check→close callbacks
- async/await本质：函数挂起+Promise微任务，事件循环继续处理其他请求
- 非阻塞I/O：Node.js在等I/O时不会阻塞，能处理其他请求
- 优先级：process.nextTick > 微任务(Promise.then) > setTimeout > setImmediate

### 核心实现（结合项目代码）
- aiController.js第19行：await callDeepSeek()→挂起→等I/O回调→恢复
- 等待期间：事件循环poll阶段→处理其他用户的HTTP请求
- deepseekService.js：axios发起HTTP请求→注册I/O回调→不阻塞
- relaySSE的upstream.on('data')：I/O回调在poll阶段执行

### 面试模拟
- Q: "事件循环有几个阶段？" → 6个：timers→pending→idle→poll→check→close
- Q: "await期间Node.js在干什么？" → 处理其他请求(非阻塞I/O)
- 追问: "nextTick和setTimeout谁先执行？" → nextTick > Promise > setTimeout > setImmediate
```

### 步骤5：改造 `teach-interview-handbook/SKILL.md` + 创建 `modules.md`

**SKILL.md改动**：
- 移出项目模块总览表 + 知识加载映射 + 教学示例 → 迁入 modules.md
- 新增子文件引用指令：教学前读取 `modules.md`
- Step 2更新：先读取modules.md确认模块编号

**modules.md内容**：
- 17模块总览表（新增模块10-12 AI工程 + 模块13-17 Node.js基础）
- 模块知识映射（模块10-12→knowledge/12，模块13-17→knowledge/13）
- 3个AI工程模块教学要点摘要
- 5个Node.js基础模块教学要点摘要
- 原有SSE教学示例（从SKILL.md迁出）

### 步骤6：更新 `3-week-interview-drill-plan.md`

**改动**：新增"第三周补充：AI工程能力攻防"

```
### Day 1-2：Q14~Q15 — MCP架构 + 双AI协作
- 必读：code-guardian/index.js + workflow-bridge/bridge.js
- 练习：画出MCP Tool调用完整流程

### Day 3：Q16~Q17 — 工作流编排 + 静态分析
- 必读：.trae/rules/01-07 + validate_architecture.js + knowledge/06
- 练习：解释正则误报根因，手写AST版import检测

### Day 4：Q18~Q19 — AST + 自动测试
- 必读：lib/function_body.js + lib/bare_async_detector.js + __tests__/
- 练习：设计自动测试生成系统架构图

### Day 5：Q20~Q21 — Node.js中间件 + 流
- 必读：backend/app.js + backend/services/deepseekService.js + knowledge/13模块13-14
- 练习：手写Express中间件链示意图，解释Node.js流vs浏览器流

### Day 6：Q22~Q23 — 模块系统 + 文件系统
- 必读：backend/data/index.js + backend/app.js第1-15行 + knowledge/13模块15-16
- 练习：画出require加载流程图，解释并发写入问题

### Day 7：Q24 — 事件循环（最高权重）
- 必读：backend/controllers/aiController.js + knowledge/13模块17
- 练习：画事件循环6阶段图，标出项目代码中每一步在哪个阶段执行
```

---

## 四、依赖关系与实施顺序

```
步骤1 questions.md ──┐
步骤2 answers.md ─────┤
                       ↓
步骤3 SKILL.md改造 ←── 引用子文件
                       ↑
步骤4 knowledge/12 ───┤
                       ↓
步骤5 teach SKILL+modules ←── 引用knowledge/12
                       ↑
步骤6 3-week-plan更新 ──┘ (最后)
```

步骤1、2可并行；步骤3依赖1、2；步骤4独立；步骤5依赖4；步骤6最后。

---

## 五、新增文件清单

| 文件 | 路径 | 目标行数 |
|------|------|---------|
| questions.md | `.trae/skills/interview-drill/questions.md` | ~115行 |
| answers.md | `.trae/skills/interview-drill/answers.md` | ~155行 |
| modules.md | `.trae/skills/teach-interview-handbook/modules.md` | ~140行 |
| 12-AI工程能力-教学要点.md | `.trae/knowledge/12-AI工程能力-教学要点.md` | ~100行 |
| 13-Node.js基础-教学要点.md | `.trae/knowledge/13-Node.js基础-教学要点.md` | ~120行 |

## 修改文件清单

| 文件 | 路径 | 改动概要 |
|------|------|---------|
| interview-drill/SKILL.md | `.trae/skills/interview-drill/SKILL.md` | 瘦身+教学模式+D组 |
| teach SKILL.md | `.trae/skills/teach-interview-handbook/SKILL.md` | 瘦身+子文件引用 |
| 3-week-plan | `.trae/documents/3-week-interview-drill-plan.md` | 新增AI工程训练周 |

---

## 六、验证标准

| 步骤 | 验证方式 |
|------|---------|
| 步骤1 | questions.md含5组24题，Q1-Q13文本与原文一致，Q14-Q19引用AI工程代码，Q20-Q24引用Node.js代码 |
| 步骤2 | answers.md含Q1-Q24答案，Q14-Q24每题引用真实代码位置 |
| 步骤3 | SKILL.md ≤150行，含教学模式Step 3.5，模式表含D组和E组 |
| 步骤4 | knowledge/12遵循knowledge/10格式，含3个AI工程模块 |
| 步骤4.5 | knowledge/13遵循knowledge/10格式，含5个Node.js模块，引用项目后端代码 |
| 步骤5 | teach SKILL.md ≤130行，modules.md含17模块总览和知识映射 |
| 步骤6 | 3-week-plan新增AI工程+Node.js训练周（7天），引用Q14-Q24 |
| 最终 | 模拟说「考我Node」→ 抽E组题 → 答错 → 教学模式启动；「考我AI工程」→ 抽D组题 |

---

## 七、假设与决策

1. **子文件加载**：Trae激活skill时，SKILL.md中用明确指令"读取 questions.md"引导AI按需读取，不假设自动加载
2. **教学模式不破坏考试节奏**：限4步框架每步1-2句，用户可选跳过
3. **Q19是缺口但有设计价值**：前半段有代码可答（测试组织），后半段考察系统设计思维
4. **现有题目编号不变**：Q1-Q13保持原样，新题目从Q14开始
5. **行数控制**：SKILL.md目标145行（安全余量55行），子文件目标≤160行
6. **Node.js题目设计**：所有Node.js题目都结合项目后端真实代码（app.js/deepseekService.js/data/index.js/aiController.js），不考脱离项目的纯理论
7. **Node.js教学顺序**：中间件(最熟悉)→流(已用过)→模块系统(知道但没深究)→文件系统(知道同步异步)→事件循环(最不熟但最重要)
