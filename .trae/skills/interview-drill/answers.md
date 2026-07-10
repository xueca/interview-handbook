# 答案锚点（考官参考，不要直接念给用户）

> 仅供考官评价时参考，不是念给用户的标准答案。

---

## A 组：SSE 专题

### Q1（三句话总结）
- 全栈AI刷题工具，Vue3+Express+DeepSeek
- 核心功能 = 题库+答题+AI出题+统计
- 技术亮点 = SSE流式输出，打字机效果

### Q3（ReadableStream + TextDecoder）
- value=Uint8Array → TextDecoder解码 → stream:true防中文UTF-8截断乱码
- 追问：stream:false时多字节字符在chunk边界被拆散

### Q4（lines.pop()）
- split按\n\n分割，最后一个可能是不完整帧
- pop取出不完整帧留buffer等下个chunk拼
- 不pop → 不完整帧当完整帧处理 → JSON.parse报错

### Q5（停止生成链路）
- 前：controller.abort() → fetch抛AbortError → 停止read()
- 后：handleStreamResponse检测受限时apiRes.destroy()
- 不关 → TCP连接泄漏，DeepSeek端继续算浪费token

### Q6（MAX_OUTPUT_CHARS）
- DeepSeek单次约8K tokens → 约16000中文字符安全线
- 不截断 → localStorage撑爆、messages数组爆炸

### Q11（reasoning_content）
- DeepSeek V4的"思考过程"，类似o1思维链
- 在delta中单独返回，和content分开
- aiParser.js用`if(delta?.content)`过滤
- 不过滤 → 用户看到AI内部推理文字混在正常输出中

## B 组：架构 + 踩坑

### Q7（分层理由）
- 修改隔离：loading逻辑改一次，所有调用vue自动生效
- 可测试性：composable可独立测试，不依赖DOM
- 举例：加loading → composable改1个文件；直接fetch → 每个vue都要改

### Q8（JSON并发）
- 读写间隙会丢数据（read→modify→write无锁）
- 当前未做并发控制
- 解决：写队列/文件锁/换SQLite（带WAL模式）
- 单用户场景不是问题，诚实承认即可

### Q9（不用TS）
- 个人项目无团队协作，类型约束ROI低
- 快速验证功能优先
- 维护期超3个月或有第二人加入 → 切TS

### Q10（最大bug）
- 不设标准答案，听用户真实故事
- 好的故事：有现象、有定位手段、有根因、有反思
- 追问：怎么定位的？console.log? 断点? Network? 花了多久？

## C 组：综合延伸

### Q12（XSS安全）
- XSS拿到token → 冒充用户调所有API
- 当前localStorage存token → 有风险
- 防御：httpOnly cookie（生产环境）、CSP头、输入转义

### Q13（协议层区别）
- SSE Content-Type: `text/event-stream`，始终是HTTP
- WebSocket先HTTP Upgrade握手（101 Switching Protocols），之后切WS协议
- SSE自动重连；WS需手动实现

## D 组：AI 工程能力

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

## E 组：Node.js 基础

### Q20（Express中间件机制）
- 中间件是函数链：req→res→next，每个app.use注册一个环节
- next()不调 → 请求挂起，客户端永远收不到响应
- 抛异常 → 如果没有错误处理中间件(4参数)，Express返回500
- app.js的自定义JSON parser：return res.status(400).json()后必须return
- 不return → 继续执行next()，res已被发送→headers already sent报错

### Q21（Node.js流）
- axios responseType:'stream' 返回的是Node.js Readable流（http.IncomingMessage）
- 和浏览器ReadableStream不同：Node.js流基于EventEmitter，浏览器流基于Promise+reader
- upstream.on('data')的data是Buffer类型，需要.toString()转字符串
- endStream防重复：ended布尔标志，if(ended)return
- Node.js事件是同步的：end和error不会"同时"触发，但可能连续触发

### Q22（CommonJS模块系统）
- require加载过程：①解析路径 ②读取文件 ③包裹函数 ④执行 ⑤缓存 ⑥返回module.exports
- 模块只执行一次：require有缓存(module._cache)，第二次require直接返回缓存
- ESM vs CommonJS：ESM静态分析(import编译时确定)、CommonJS动态(require运行时)
- ESM export是引用(live binding)，CommonJS module.exports是值拷贝
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
