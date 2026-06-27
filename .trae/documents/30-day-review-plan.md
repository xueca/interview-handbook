# 面试宝典 — 30 天项目复习计划（6/11 → 7/10）

> 版本: v1.0 | 创建: 2026-06-11  
> 目标: 从零散学习变为系统复习，覆盖全部 9 大模块 + 部署 + 面试模拟  
> 工具: `teach-interview-handbook`（教学）+ `interview-drill`（拷打）联动使用

---

## 设计理念

这个计划不是让你"重新学一遍"，而是让你**按面试官的提问逻辑重新组织知识**。每一天的流程是：

```
回顾代码（20min） → teach讲解疑点（30min） → drill验证（20min） → 记录薄弱点
```

每个阶段结束时有一天的「弹性日」，用来补漏或休息。

---

## 第一阶段：基础模块回顾（6/11 - 6/17，7 天）

> 目标：把 Week1-2 的 6 个模块（JWT、题库、答题、错题本、统计、路由守卫）逐个吃透。
> 这些都是面试官可能问到的"周边模块"，不能只会核心亮点。

### Day 1（6/11 三）：模块1 — JWT 认证体系

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 读 [frontend/src/api/request.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/api/request.js) + [backend/middleware/auth.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/middleware/auth.js) | 代码回顾 |
| 30min | 说「**教我 JWT 认证是怎么设计的**」→ teach 讲解 | AI教学 |
| 20min | 说「**考我架构**」挑 JWT 相关题（Q12）→ drill 验证 | AI拷打 |
| 10min | 记录薄弱点 | 笔记 |

**核心文件**: `request.js`(Axios拦截器)、`auth.js`(JWT签发/验证)、`authController.js`(登录注册)、`user.js`(user store)

**关键问题**:
- JWT 三部分是什么？签名段怎么防篡改？
- 401 拦截器怎么处理过期 token？为什么用硬跳转而不是 router.push？
- 为什么用 localStorage 存 token 而不是 cookie？

### Day 2（6/12 四）：模块2+3 — 路由守卫 + JSON 存储

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 读 [frontend/src/router/index.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/router/index.js) + [backend/data/index.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/data/index.js) | 代码回顾 |
| 30min | 说「**教我路由守卫怎么拦截未登录的**」→ teach | AI教学 |
| 20min | 回答 Q8：JSON 并发写冲突 → 你说完让 AI 评价 | 自测 |

**核心文件**: `router/index.js`(beforeEach守卫)、`backend/data/index.js`(readJSON/writeJSON)

**关键问题**:
- beforeEach 怎么判断登录状态？白名单路由有哪些？
- JSON 文件做数据库的优势和致命缺陷是什么？

### Day 3（6/13 五）：模块4 — 题库系统

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 读 [frontend/src/composables/useQuestionBank.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/composables/useQuestionBank.js) + [backend/controllers/questionController.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/controllers/questionController.js) | 代码回顾 |
| 30min | 说「**教我题库的筛选搜索分页是怎么实现的**」→ teach | AI教学 |
| 20min | 自己口述：从页面加载到列表渲染的完整数据流 | 自测 |

**核心文件**: `useQuestionBank.js`(筛选+搜索+分页)、`questionController.js`(getList/getDetail)

**关键问题**:
- 筛选条件怎么传给后端的？用什么参数？
- 前端分页还是后端分页？为什么？

### Day 4（6/14 六）：模块5 — 答题引擎（⭐⭐⭐ 高频）

| 时间 | 任务 | 方式 |
|------|------|------|
| 30min | 读 [frontend/src/composables/useQuiz.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/composables/useQuiz.js) + [useTimer.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/composables/useTimer.js) + [Quiz.vue](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/views/Quiz.vue) | 代码回顾 |
| 30min | 说「**教我答题引擎怎么支持单选和多选的**」→ teach | AI教学 |
| 20min | 说「**考我架构**」挑答题相关题 → drill | AI拷打 |

**核心文件**: `useQuiz.js`(答题逻辑)、`useTimer.js`(倒计时)、`Quiz.vue`(渲染)

**关键问题**:
- 为什么拆成 useQuiz + useTimer 两个 composable？
- 答案存储结构 `{[qid]: [0, 2]}` 为什么这么设计？
- 倒计时归零怎么自动提交？
- 怎么防止快速点击重复提交？

### Day 5（6/15 日）：模块6 — 错题本

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 读 [frontend/src/composables/useWrongBook.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/composables/useWrongBook.js) + [WrongBook.vue](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/views/WrongBook.vue) | 代码回顾 |
| 30min | 说「**教我错题本的三次答对移除是怎么做的**」→ teach | AI教学 |
| 20min | 讲给空气听：consecutiveCorrect 的计算逻辑 | 自测 |

**核心文件**: `useWrongBook.js`(错题列表+标记)、`WrongBook.vue`(展示)

**关键问题**:
- 三次答对移除的计数器存在哪？每次提交怎么更新？
- 标记功能和错题本的关系是什么？

### Day 6（6/16 一）：模块7 — 统计仪表盘

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 读 [Dashboard.vue](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/views/Dashboard.vue) + [backend/controllers/recordController.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/controllers/recordController.js) | 代码回顾 |
| 30min | 说「**教我 Dashboard 的数据是怎么来的**」→ teach | AI教学 |
| 20min | 画出：records.json → recordController → Dashboard 的数据流 | 自测 |

**核心文件**: `Dashboard.vue`(ECharts渲染)、`recordController.js`(stats/getStats)

**关键问题**:
- ECharts 数据是从哪个接口拿的？返回结构是什么？
- 暗黑模式怎么适配 ECharts？

### Day 7（6/17 二）：第一阶段弹性日

**选项 A（推荐）**：回看 Day1-6 中标记的薄弱点，用 teach/drill 补强  
**选项 B**：休息一天  
**选项 C**：用 `interview-drill` 做一次「架构专题」，抽 3 题自测

---

## 第二阶段：核心亮点深度攻防（6/18 - 6/24，7 天）

> 目标：SSE 流式输出的 7 道题，每题都能在面试官的深度追问下答上来。
> 这是你的"王牌模块"，面试官 50% 的时间会花在这上面。

### Day 8（6/18 三）：SSE 架构理解（对应 Q1 + Q2）

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 对着项目目录树，默写所有 SSE 相关文件（7 个文件）和它们的职责 | 自测 |
| 30min | 口述 Q1（三句话）+ 在白板上画 Q2（完整数据流） | 自测 |
| 20min | 说「**考我 SSE**」让 AI 抽 Q1/Q2 | AI拷打 |

**练习重点**: 60 秒内画完从用户输入到屏幕显示的完整链路，每个节点标注文件名+函数名

### Day 9（6/19 四）：SSE 底层 API（对应 Q3 + Q4）

| 时间 | 任务 | 方式 |
|------|------|------|
| 30min | 精读 [sse.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/api/sse.js) 每一行，理解 ReadableStream → TextDecoder → processBuffer | 代码精读 |
| 20min | 自问自答：不加 `{stream:true}` 会出现什么 bug？用中文 UTF-8 举例 | 自测 |
| 20min | 说「**教我用 fetch+ReadableStream 怎么处理中文截断**」→ teach 深讲 | AI教学 |
| 20min | 说「**考我 SSE**」让 AI 抽 Q3/Q4 | AI拷打 |

**练习重点**: 能解释为什么 `read()` 是递归调用而不是 while 循环

### Day 10（6/20 五）：SSE 前后端联动（对应 Q5 + Q6）

| 时间 | 任务 | 方式 |
|------|------|------|
| 30min | 精读 [aiController.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/controllers/aiController.js) handleStreamResponse 函数 | 代码精读 |
| 20min | 画出：用户点"停止" → controller.abort() → apiRes.destroy() 的完整链路 | 自测 |
| 20min | 自问自答：MAX_OUTPUT_CHARS 为什么是 16000？怎么验证？ | 自测 |

**练习重点**: 能讲清楚 AbortController 是怎么从前端传到后端的（它其实传不过去，前后端各自关闭自己的连接）

### Day 11（6/21 六）：V4 兼容 + 三阶段渲染（对应 Q11 + 消息状态机）

| 时间 | 任务 | 方式 |
|------|------|------|
| 30min | 读 [aiParser.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/backend/controllers/aiParser.js) + [AiChat.vue](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/views/AiChat.vue) | 代码精读 |
| 20min | 口述：pending → thinking → generating → question/text 每种状态对应的 UI | 自测 |
| 20min | 说「**考我 SSE**」让 AI 抽 Q11 | AI拷打 |

**练习重点**: DeepSeek V3 和 V4 的响应格式区别，reasoning_content 在哪出现

### Day 12（6/22 日）：综合延伸（对应 Q12 + Q13）

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 回顾 Day1 JWT 内容 + Day8-11 SSE 内容 | 快速回顾 |
| 30min | 自问自答 Q12（XSS 安全）+ Q13（协议层） | 自测 |
| 20min | 说「**考我安全**」让 AI 全考 | AI拷打 |

**练习重点**: Q13 准备好协议层的回答（Content-Type: text/event-stream vs HTTP Upgrade 101）

### Day 13（6/23 一）：踩坑故事打磨（对应 Q10）

| 时间 | 任务 | 方式 |
|------|------|------|
| 20min | 从执行手册 §七 挑 2 个你印象最深的坑 | 回顾 |
| 30min | 用"现象→定位→根因→修复→反思"五段式写成自己的故事 | 写作 |
| 20min | 讲给空气听，计时 2 分钟 | 口述练习 |
| 20min | 说「**考我架构**」让 AI 问 Q10 | AI拷打 |

**推荐的 2 个坑**:
1. SSE 中文乱码 → TextDecoder `{stream:true}` 的故事
2. V4 reasoning_content 混入 → aiParser 过滤的故事

### Day 14（6/24 二）：第二阶段弹性日

**选项 A**：回看 Day8-13 中标记的薄弱点  
**选项 B**：做一次 SSE 专题全量测试（7 题全部口述一遍）  
**选项 C**：休息

---

## 第三阶段：弱项补强 + 全真模拟（6/25 - 7/3，9 天）

> 目标：找出所有答不好的题，逐个消灭。然后做 2-3 次全真模拟。

### Day 15-16（6/25-26）：弱项定位 + 补强

| 任务 | 方式 |
|------|------|
| 说「**全真模拟**」做一次完整面试 | AI 随机抽 5 题连续拷打 |
| 记录所有 ⚠️/❌ 的题 | 自己记笔记 |
| 对每个弱项说「**教我 XXX**」让 teach 深讲 | AI教学 |

### Day 17（6/27 五）：架构题补强（对应 Q7 + Q8 + Q9）

| 时间 | 任务 | 方式 |
|------|------|------|
| 30min | 精读 [.trae/rules/01-architecture-contract.md](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/.trae/rules/01-architecture-contract.md) + [03-anti-patterns.md](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/.trae/rules/03-anti-patterns.md) | 回顾规则 |
| 20min | 口述 Q7（分层理由）+ Q9（不用 TS） | 自测 |
| 20min | 说「**考我架构**」让 AI 抽 Q7/Q8/Q9 | AI拷打 |

### Day 18-19（6/28-29）：全真模拟 ×2

| 任务 | 方式 |
|------|------|
| 每次选「**全真模拟**」，连续 5 题 | AI拷打 |
| 两次之间隔半天，给大脑消化时间 | - |
| 第二次的目标：所有题 ≥ ⚠️，至少 3 道 ✅ | 自评 |

### Day 20（6/30 一）：技术选型答辩（对应 Q9 延伸）

| 时间 | 任务 | 方式 |
|------|------|------|
| 30min | 准备每个技术选型的"为什么选 A 不选 B"回答：Vue3/Express/JSON/SSE/Pinia/Element Plus | 写作 |
| 20min | 重点准备"不用 TS"的回答 — 这是最容易被追问的 | 口述练习 |

**一句话模板**：「我选 X 是因为我的场景需要 A 和 B，而 X 恰好在这两点上最优。如果场景变成 C，我会换 Y。」

### Day 21-22（7/1-2）：全模块快速过一遍

每天花 1.5 小时，30 分钟一个模块，快速回顾 Day1-7 的 7 个模块。不是重学，而是确认"每一个模块我都能用 30 秒讲清楚它的数据流"。

| 7/1 | 7/2 |
|-----|-----|
| JWT → 路由守卫 → JSON存储 → 题库 | 答题引擎 → 错题本 → Dashboard |

### Day 23（7/3 三）：第三阶段弹性日

---

## 第四阶段：最终冲刺（7/4 - 7/10，7 天）

> 目标：打磨出"满分回答"，模拟真实面试压力和节奏。

### Day 24（7/4 五）：AI 模块满分冲刺

精读 [useAiChat.js](file:///d:/BaiduNetdiskDownload/A055/sql/trae/shu-ju/webtest/interview-handbook/frontend/src/composables/useAiChat.js) 全部功能：
- sendMessage / generateQuestions / callSSE / abortCurrent / stop
- tryParseQuestion / fallbackToNonStream / handleError
- saveToLocalStorage / loadFromLocalStorage / estimateTokens / trimMessages

对每个函数用 30 秒说清楚它做什么、为什么放在这一层

### Day 25（7/5 六）：最终全真模拟 #1

**「全真模拟」连续 7 题**，严格模拟真实面试。中间不喊停。结束后逐题复盘。

### Day 26（7/6 日）：复盘 + 弱项最后修补

对照 Day25 的结果，对 ❌ 的题用 teach 回炉。

### Day 27（7/7 一）：最终全真模拟 #2

**「全真模拟」连续 7 题**，目标：全部 ≥ ⚠️，至少 5 道 ✅。

### Day 28（7/8 二）：自我介绍 + 项目介绍打磨

对着镜子练 3 遍 1 分钟自我介绍（执行手册 §6.1 有模板）。  
要求：不看稿、不卡壳、有停顿、有重点。

### Day 29（7/9 三）：休息 + 轻量回顾

只看笔记中记录的薄弱点，不做新题。

### Day 30（7/10 四）：上战场

带着 30 天的积累去面试。

---

## 每日最小时间投入

| 场景 | 最小时间 | 操作 |
|------|---------|------|
| 有整块时间 | 90min | 完整走「回顾→teach→drill」流程 |
| 碎片时间 | 20min | 只做 drill 抽 1-2 题自测 |
| 累了 | 10min | 看一遍当天的"关键问题"列表，能答上来就过 |

---

## 与两个 Skill 的配合

```
teach-interview-handbook     interview-drill
      │                            │
      │  "教我 JWT"                 │  "考我 SSE"
      │  讲解 + 模拟问答            │  抽题 + 评价 + 引导 teach
      │         ↓                   │         ↓
      │  提示"考我验证"             │  弱项引导"教我用XXX"
      │                            │
      └──────── 互相引用 ──────────┘
```

**触发词速查**:

| 你想做什么 | 对 AI 说 |
|-----------|---------|
| 学模块1-7 | `教我 JWT 认证是怎么设计的` / `教我答题引擎是怎么做的` |
| 学模块8-9 | `教我 SSE 流式输出是怎么实现的` / `教我 AI 思考动画三阶段` |
| 考 SSE | `考我 SSE` |
| 考架构 | `考我架构` |
| 考安全 | `考我安全` |
| 全真模拟 | `全真模拟` |
| 自由追问 | `我问你一个问题：XXX` |

---

## 13 题快速索引

| 题号 | 问题关键词 | 对应 Day |
|------|-----------|---------|
| Q1 | 三句话总结项目 | Day 8 |
| Q2 | 白板画完整数据流 | Day 8 |
| Q3 | ReadableStream + TextDecoder | Day 9 |
| Q4 | buffer.split + lines.pop() | Day 9 |
| Q5 | AbortController停止生成全链路 | Day 10 |
| Q6 | MAX_OUTPUT_CHARS = 16000 | Day 10 |
| Q7 | 为什么分层，不准直接调fetch | Day 17 |
| Q8 | JSON文件并发写冲突 | Day 2, 17 |
| Q9 | 为什么不用TypeScript | Day 17, 20 |
| Q10 | 最大bug+怎么定位 | Day 13 |
| Q11 | V4 reasoning_content | Day 11 |
| Q12 | JWT存localStorage + XSS | Day 1, 12 |
| Q13 | SSE vs WebSocket协议层 | Day 12 |