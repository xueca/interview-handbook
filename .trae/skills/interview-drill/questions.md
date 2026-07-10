# 面试题库（5 组 24 题）

> 考官出题前必须读取本文件。答案锚点在 answers.md。

---

## 分组 A：SSE 专题（Q1~Q6 + Q11，共 7 题）

| 编号 | 问题 |
|------|------|
| Q1 | 「用三句话说清楚你的项目是什么、你做了什么、最值得说的技术点。」 |
| Q2 | 「在白板上画出从用户输入到 AI 回复显示在屏幕上的完整数据流，每一步经过什么文件、什么函数，不要跳。」 |
| Q3 | 「你代码里用 fetch + ReadableStream 替代 EventSource。ReadableStream 的 getReader() 返回的 value 是什么类型？为什么要用 TextDecoder？不 decode 直接用会怎样？」 |
| Q3-追问 | 「TextDecoder 的 `{ stream: true }` 参数是干什么的？去掉会出什么 bug？用中文 UTF-8 编码举例说明。」 |
| Q4 | 「你代码里 `buffer.split('\n\n')` 然后 `lines.pop()`，这个 pop 是干什么的？如果不 pop 会怎样？」 |
| Q4-追问 | 「你怎么验证这个 pop 真的有用？如果一个 chunk 刚好在 `\n\n` 中间怎么办？」 |
| Q5 | 「用户点'停止生成'后，后端到 DeepSeek 的 https.request 连接关了吗？怎么关的？如果不关会发生什么？」 |
| Q6 | 「你后端设了 MAX_OUTPUT_CHARS = 16000，为什么是 16000？怎么验证这个值合理的？如果去掉截断，最坏情况下会发生什么？」 |
| Q11 | 「DeepSeek V4 的 reasoning_content 是什么？它和 content 有什么区别？你在哪里过滤的？如果不过滤用户会看到什么？」 |

## 分组 B：架构 + 踩坑（Q7~Q10，共 4 题）

| 编号 | 问题 |
|------|------|
| Q7 | 「你项目里规定 vue 文件不能直接调 fetch，必须走 composable → api 层。为什么？直接写 fetch 不是更简单吗？谁逼你绕这么远？」 |
| Q7-追问 | 「假如要加一个'请求前 loading、请求后关 loading'的功能，直接写在 vue 里要改多少个文件？走 composable 呢？」 |
| Q8 | 「你后端用 JSON 文件存数据。如果两个用户同时答题、同时写 records.json，会发生什么？你代码里有做并发控制吗？」 |
| Q9 | 「为什么选 Vue3 不用 TypeScript？给我一个面试官能接受的理由，不要只说'省时间'。」 |
| Q10 | 「做这个项目遇到最大的 bug 是什么？怎么定位的？用了什么调试手段？如果重来一次怎么避免？」 |

## 分组 C：综合延伸（Q12~Q13，共 2 题）

| 编号 | 问题 |
|------|------|
| Q12 | 「JWT 存在 localStorage 里，如果有人 XSS 拿到了 token，能做什么？你觉得应该怎么防御？」 |
| Q13 | 「SSE 和 WebSocket 在 HTTP 协议层面有什么区别？SSE 的 Content-Type 是什么？WebSocket 怎么建立的？」 |

## 分组 D：AI 工程能力（Q14~Q19，共 6 题）

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

## 分组 E：Node.js 基础（Q20~Q24，共 5 题）

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
