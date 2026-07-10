# Node.js 基础 — 教学要点

> 模块13-17，匹配目标公司要求：精通 Node.js。
> 用户自评"对Node.js也不懂"，虽然用了Express写后端但核心原理没系统学过。
> 教学时配合 teach-interview-handbook Skill 使用。

---

## 模块13：Express 中间件机制 (⭐⭐⭐⭐)

### ① 功能定位
Express 中间件是处理 HTTP 请求的函数链，每个 app.use 注册一个环节，按顺序执行。

### ② 设计思路

**中间件本质**
- 函数链：每个中间件接收 (req, res, next)
- next() 的作用：把控制权交给下一个中间件
- 不调 next()：请求挂起，客户端永远收不到响应

**错误处理**
- 普通中间件(3参数)抛异常 → Express 默认返回500
- 错误处理中间件(4参数：err, req, res, next) → 需放在最后注册

**为什么自定义 JSON parser 而不用 express.json()**
- 调试需求：需要打印解析失败的原文字符串
- 错误信息更友好：自定义错误格式而非 Express 默认

### ③ 核心实现（结合项目代码）
- app.js：cors → 自定义JSON parser → 路由注册
- 自定义 JSON parser 的 return 逻辑
- 如果 JSON.parse 失败 → res.status(400).json() → 必须 return
- 不 return → 继续执行 next() → res 已发送 → "headers already sent" 报错

### ⑤ 面试模拟
**面试官**：Express 中间件机制是什么？
**你应该答**：中间件是函数链，每个 app.use 注册一个 (req, res, next) 函数。请求按顺序穿过每个中间件，next() 把控制权交给下一个。不调 next() 请求就挂起。
**面试官追问**：res.json() 之后不 return 会怎样？
**你应该答**：res 已经发送了，但代码继续执行 next()，后面的中间件尝试操作 res 会报 "headers already sent"。所以 res.status(400).json() 后必须 return 中止链。

---

## 模块14：Node.js 流(Stream) (⭐⭐⭐⭐⭐)

### ① 功能定位
Node.js 流是基于 EventEmitter 的数据处理方式，分批读取大块数据，避免一次性加载到内存。

### ② 设计思路

**Node.js 流 vs 浏览器流**
- Node.js 流基于 EventEmitter（data / end / error 事件），推模式
- 浏览器 ReadableStream 基于 Promise + reader.read()，拉模式
- 区别：Node.js 流自动推送数据（on('data')），浏览器需要手动 read()

**Buffer**
- Node.js 二进制数据容器，类似 Uint8Array
- upstream.on('data') 收到的是 Buffer，需要 .toString() 转字符串

**前后端流的对称性**
- 后端：Node.js Readable 流（DeepSeek → axios stream → upstream）
- 传输：HTTP chunked transfer
- 前端：浏览器 ReadableStream（fetch → response.body → reader.read()）

### ③ 核心实现（结合项目代码）
- deepseekService.js：responseType: 'stream' 获取 Node.js Readable 流
- relaySSE：upstream.on('data') 接收 Buffer，.toString() 后转发给前端
- ended 标志防重复关闭：end 和 error 可能连续触发

### ⑤ 面试模拟
**面试官**：Node.js 流和浏览器流有什么区别？
**你应该答**：Node.js 流基于 EventEmitter，是推模式——数据自动触发 on('data') 事件。浏览器 ReadableStream 基于 Promise，是拉模式——需要手动调 reader.read() 获取数据。
**面试官追问**：upstream.on('data') 的 data 是什么类型？
**你应该答**：Buffer，Node.js 的二进制容器。需要 .toString() 转成字符串才能处理 SSE 协议的文本格式。

---

## 模块15：CommonJS 模块系统 (⭐⭐⭐)

### ① 功能定位
CommonJS 是 Node.js 的默认模块系统，通过 require / module.exports 实现代码拆分和复用。

### ② 设计思路

**require 加载过程（6步）**
1. 解析路径：相对/绝对/模块名 → 确定文件路径
2. 读取文件：读取文件内容
3. 包裹函数：`(function(exports, require, module, __filename, __dirname) { ... })`
4. 执行：运行模块代码
5. 缓存：存入 Module._cache
6. 返回：返回 module.exports

**为什么 require 有缓存**
- 避免重复执行：模块只执行一次
- 性能：第二次 require 直接返回缓存对象

**CommonJS vs ESM**
- CommonJS：动态（require 运行时确定），值拷贝
- ESM：静态（import 编译时确定），引用绑定(live binding)

### ③ 核心实现（结合项目代码）
- app.js：require('dotenv').config() 同步执行 → 写入 process.env
- data/index.js：module.exports 导出 readJSON / writeJSON
- 后续 require 的模块能读到 process.env.PORT（因为 dotenv 已同步执行）

### ⑤ 面试模拟
**面试官**：require 的加载过程是怎样的？
**你应该答**：6步：解析路径→读取文件→包裹函数→执行→缓存→返回 module.exports。模块只执行一次，因为有 Module._cache 缓存。
**面试官追问**：require 和 import 有什么区别？
**你应该答**：require 是 CommonJS，运行时动态加载，值拷贝。import 是 ESM，编译时静态分析，引用绑定（live binding）。改了导出的值，import 端能同步看到变化，require 端不能。

---

## 模块16：Node.js 文件系统 (⭐⭐⭐)

### ① 功能定位
Node.js fs 模块提供文件读写能力，分同步（Sync）和异步（回调/Promise）两种 API。

### ② 设计思路

**同步 vs 异步**
- readFileSync：阻塞事件循环，等磁盘 IO 时无法处理其他请求
- readFile：不阻塞，回调在 I/O 完成后由事件循环调度

**为什么项目用同步**
- JSON 文件小（几 KB），读取几乎瞬间
- 单用户场景，没有并发
- 简单直接，不需要回调/Promise 链

**并发写入问题**
- read → modify → write 无锁
- 两个请求同时写：A 读到旧数据→B 读到旧数据→A 写→B 写（覆盖 A）

### ③ 核心实现（结合项目代码）
- data/index.js：fs.readFileSync / fs.writeFileSync 同步读写 JSON
- writeJSON：readJSON → push → writeJSON，无并发控制

### ⑤ 面试模拟
**面试官**：为什么用 readFileSync 不用 readFile？
**你应该答**：项目 JSON 文件小（几 KB），单用户场景，同步读取简单直接。高并发场景需要换异步 + 写队列或 SQLite。
**面试官追问**：高并发下会出什么问题？
**你应该答**：两个请求同时 writeJSON → read-modify-write 无锁 → 后写入的覆盖前写入的数据。解决：写队列串行化写入、文件锁、或换 SQLite（WAL 模式自带并发控制）。

---

## 模块17：Node.js 事件循环 (⭐⭐⭐⭐⭐)

### ① 功能定位
事件循环是 Node.js 单线程异步的核心机制，让单线程能处理大量并发 I/O 操作。

### ② 设计思路

**6个阶段**
1. timers：执行 setTimeout / setInterval 到期的回调
2. pending callbacks：系统级回调（TCP 错误等）
3. idle / prepare：内部使用
4. poll：I/O 事件（网络/文件回调在此执行）
5. check：执行 setImmediate 回调
6. close callbacks：close 事件回调

**async/await 与事件循环**
- await 挂起函数 → 注册 I/O 回调 → 函数返回 Promise
- 等待期间事件循环继续 → poll 阶段处理其他请求
- I/O 完成后 → 微任务队列(Promise.then) → 恢复 await 后的代码

**优先级**
- process.nextTick > 微任务(Promise.then) > setTimeout > setImmediate

### ③ 核心实现（结合项目代码）
- aiController.js：await callDeepSeek() → 函数挂起 → 等待 DeepSeek 响应
- 等待期间：事件循环 poll 阶段 → 处理其他用户的 HTTP 请求（非阻塞 I/O）
- deepseekService.js：axios 发起 HTTP 请求 → 注册 I/O 回调 → 不阻塞
- relaySSE 的 upstream.on('data')：I/O 回调在 poll 阶段执行

### ⑤ 面试模拟
**面试官**：事件循环有几个阶段？
**你应该答**：6个：timers→pending callbacks→idle/prepare→poll→check→close callbacks。I/O 回调在 poll 阶段执行，setTimeout 在 timers 阶段，setImmediate 在 check 阶段。
**面试官追问**：await 期间 Node.js 在干什么？
**你应该答**：函数挂起，注册 I/O 回调，事件循环继续运转。在等 DeepSeek 响应时，poll 阶段可以处理其他用户的 HTTP 请求，这就是 Node.js 非阻塞 I/O 的核心——单线程也能处理高并发，因为 I/O 等待时不闲着。
