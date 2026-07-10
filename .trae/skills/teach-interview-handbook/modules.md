# 项目模块总览 + 知识映射

> 教学指导老师读取本文件，确认模块编号、找到对应 knowledge 文件和面试题号。

---

## 17 模块总览表

| 模块 | 名称 | 核心文件 | 面试权重 | 知识文件 |
|------|------|---------|---------|---------|
| 1 | JWT认证体系 | request.js, auth.js | ⭐⭐⭐ | knowledge/08 |
| 2 | 路由守卫+布局 | router/index.js | ⭐⭐ | — |
| 3 | JSON文件存储 | data/index.js | ⭐⭐ | — |
| 4 | 题库系统 | QuestionBank.vue | ⭐⭐ | — |
| 5 | 答题引擎 | useQuiz.js, useTimer.js | ⭐⭐⭐ | knowledge/09 |
| 6 | 错题本 | WrongBook.vue | ⭐⭐ | — |
| 7 | 统计仪表盘 | Dashboard.vue | ⭐⭐ | — |
| 8 | SSE流式AI出题 | aiController.js, sse.js | ⭐⭐⭐⭐⭐ | knowledge/10 |
| 9 | AI思考动画+格式化卡片 | AiChat.vue, AiQuestionCard.vue | ⭐⭐⭐⭐ | knowledge/11 |
| 10 | Code Guardian MCP Server | code-guardian/index.js | ⭐⭐⭐⭐⭐ | knowledge/12 |
| 11 | 双AI工作流编排 | workflow-bridge/bridge.js | ⭐⭐⭐⭐ | knowledge/12 |
| 12 | 静态分析与自动测试 | function_body.js, __tests__/ | ⭐⭐⭐⭐ | knowledge/12 |
| 13 | Express中间件机制 | backend/app.js | ⭐⭐⭐⭐ | knowledge/13 |
| 14 | Node.js流(Stream) | deepseekService.js | ⭐⭐⭐⭐⭐ | knowledge/13 |
| 15 | CommonJS模块系统 | app.js, data/index.js | ⭐⭐⭐ | knowledge/13 |
| 16 | Node.js文件系统 | data/index.js | ⭐⭐⭐ | knowledge/13 |
| 17 | Node.js事件循环 | aiController.js | ⭐⭐⭐⭐⭐ | knowledge/13 |

---

## 模块知识映射

- 模块1 → knowledge/08-JWT认证
- 模块5 → knowledge/09-答题引擎
- 模块8 → knowledge/10-SSE流式AI出题
- 模块9 → knowledge/11-AI思考动画
- 模块10-12 → knowledge/12-AI工程能力（一个文件覆盖3个模块）
- 模块13-17 → knowledge/13-Node.js基础（一个文件覆盖5个模块）
- 模块2,3,4,6,7 → 无 knowledge 文件，直接读取源代码

---

## AI工程模块摘要（模块10-12，对应 D 组 Q14-Q19）

### 模块10：Code Guardian MCP Server → Q14
- MCP三大原语：Tools(可执行)、Resources(可读数据)、Prompts(模板)
- 项目用 server.tool() 注册6个Tool → 属于Tools原语
- Agent vs 工具边界：Code Guardian 是工具不是Agent（缺自主决策循环）

### 模块11：双AI工作流编排 → Q15
- Trae Solo(规划) + Claude Code(执行)，通过文件系统传递上下文
- Workflow Bridge 三命令：status / archive / init
- 三个断点：上下文丢失(最危险)、Skills是文本指令、规则靠AI自觉

### 模块12：静态分析与自动测试 → Q16-Q19
- 正则 vs AST：extractImportStatements 正则方案有误报（字符串字面量）
- function_body.js 大括号计数是伪AST，遇到字符串里的 `{` 会出错
- 自动测试缺口：只有手写测试，设计思路是源码签名推导 + 配置生成边界用例

---

## Node.js基础模块摘要（模块13-17，对应 E 组 Q20-Q24）

### 模块13：Express中间件机制 → Q20
- 中间件是函数链：(req, res, next)，next() 把控制权交给下一个
- 自定义JSON parser 的 return 逻辑：res.status(400).json() 后必须 return
- 不 return → "headers already sent" 报错

### 模块14：Node.js流(Stream) → Q21
- Node.js流基于EventEmitter（推模式），浏览器流基于Promise+reader（拉模式）
- upstream.on('data') 收到 Buffer，需要 .toString() 转字符串
- ended 标志防重复关闭

### 模块15：CommonJS模块系统 → Q22
- require加载6步：解析路径→读取→包裹→执行→缓存→返回
- 模块只执行一次（Module._cache 缓存）
- CommonJS值拷贝 vs ESM引用绑定(live binding)

### 模块16：Node.js文件系统 → Q23
- readFileSync 阻塞事件循环，readFile 不阻塞
- 项目用同步：JSON文件小 + 单用户 + 简单
- 并发写入问题：read→modify→write 无锁 → 数据丢失

### 模块17：Node.js事件循环 → Q24
- 6阶段：timers→pending→idle→poll→check→close
- await 挂起函数 → 事件循环继续处理其他请求（非阻塞I/O）
- 优先级：process.nextTick > Promise > setTimeout > setImmediate

---

## 模块与 interview-drill 联动映射

教学结束后建议用户进入对应题组自测：

| 教学模块 | drill 题组 | 触发词 |
|---------|-----------|--------|
| 模块1-9 | A/B/C组 | 「考我SSE」「考我架构」「考我安全」 |
| 模块10-12 | D组（Q14-Q19） | 「考我AI工程」 |
| 模块13-17 | E组（Q20-Q24） | 「考我Node」 |

---

## 教学示例框架

**用户说："教我SSE流式输出是怎么实现的"**

你应该这样组织回答：

> ## SSE流式AI出题 — 教学讲解
>
> ### ① 功能定位
> [1-2句话说明功能价值]
>
> ### ② 设计思路
> [技术选型理由 + 数据流路径 + 边界处理]
>
> ### ③ 核心实现
> [关键文件作用 + 重要技术点，不逐行念代码]
>
> ### ④ 踩坑记录
> [真实遇到的问题 + 定位手段 + 解决方案]
>
> ### ⑤ 面试模拟
> **面试官**：[问题]
> **你应该答**：[口语化回答]
> **面试官追问**：[深度问题]
> **你应该答**：[深入回答]
