# AI面试押题助手 — 实现计划

> 目标：在现有面试宝典项目中新增「AI面试押题助手」功能，复刻牛客4步押题流程（JD解读→简历分析→真题检索→押题生成），预填用户的AI编程实习生岗位JD，生成闭卷手写押题。

## 一、需求背景

用户即将面试「AI编程实习生」岗位（福州大象创意网络科技，20-50人工作室），考核形式为全栈+AI方向闭卷手写题。JD核心要求：多Agent协作架构、代码生成/测试/Review Agent、AST/静态分析/Lint、Prompt结构化设计、CI/CD+AI流水线、GPT/Claude/DeepSeek API调用、精通Python或Node.js。

用户薄弱点：Node.js核心原理不熟（简历写熟悉实则不了解）、Python仅基础、AST原理不了解。

牛客工具流程（来自用户截图）：输入岗位+公司+JD → 4步进度条（JD解读→简历分析→真题面经检索→押题生成）→ 输出个性化押题。

## 二、现有架构确认（已验证）

| 层级 | 文件 | 复用点 |
|------|------|--------|
| 后端SSE | `services/deepseekService.js` | `callDeepSeek`/`initSSE`/`relaySSE` — 需新增 `streamChunks` 原语 |
| 后端JSON解析 | `controllers/aiParser.js` | `repairJSON(str)` — 移除markdown+补全不完整JSON |
| 后端数据层 | `data/index.js` | `readJSON(filename)` — 仅支持data/直属文件，**不支持子目录** |
| 后端路由 | `routes/ai.js` + `app.js` | `auth`中间件 + `validateBody`中间件模式 |
| 前端SSE | `api/sse.js` | `createSSE(url, body, onMessage, onError)` — 已内置`[DONE]`→`{type:'status',status:'done'}`转换 |
| 前端路由 | `router/index.js` | 路由数组 + beforeEach守卫 |
| 前端布局 | `App.vue` | el-menu侧边栏，菜单项用 `@element-plus/icons-vue` 图标 |

**架构约束**：views → composables → api → backend 单向依赖；.vue ≤200行 / .js ≤150行 / 函数 ≤30行 / 参数 ≤4个；视图层禁止fetch/axios（GOLDEN_RULE_001）。

## 三、目录结构

```
backend/
├── data/
│   ├── mianjing/                       # 【新增】面经数据库
│   │   ├── ai-engineering.json         # AI工程题 15题
│   │   ├── nodejs.json                 # Node.js题 15题
│   │   ├── python.json                 # Python题 8题
│   │   └── fullstack.json             # 全栈手写题 12题
│   └── mianjingStore.js                # 【新增】面经检索器(读子目录+关键词匹配)
├── services/
│   └── deepseekService.js              # 【修改】+streamChunks() 流式回调原语
├── controllers/
│   ├── predictPrompt.js                # 【新增】4步押题Prompt构建
│   └── predictController.js            # 【新增】4步SSE编排控制器
├── routes/
│   └── predict.js                      # 【新增】POST /stream 路由
└── app.js                              # 【修改】注册 /api/predict (+2行)

frontend/src/
├── api/predict.js                      # 【新增】predictStream封装createSSE
├── composables/usePredict.js           # 【新增】押题状态管理+SSE回调
├── constants/predictDefault.js         # 【新增】预填JD+简历模板
├── views/
│   ├── Predict.vue                     # 【新增】押题主页面(输入+步骤条+结果)
│   └── PredictStepResult.vue           # 【新增】步骤1-3结构化结果子组件
├── styles/predict.css                  # 【新增】押题页样式(外置降低vue行数)
├── router/index.js                     # 【修改】+/predict路由 (+5行)
└── App.vue                             # 【修改】侧边栏+菜单项 (+5行)
```

## 四、架构决策

### 4.1 单端点4步顺序编排（非4个独立接口）
4步强顺序依赖（步骤2依赖步骤1结果，步骤4依赖1+2+3全部结果）。单端点`POST /api/predict/stream`让后端持有中间状态，前端一次连接按消息类型渲染，符合SSE契约三段式数据流。

### 4.2 步骤1-3非流式、步骤4流式
步骤1-3产物是结构化JSON（技能列表/差距分析/真题列表），需完整解析后供下一步使用，流式无意义。步骤4产出长文本押题（markdown题目+答案），流式渲染提供打字机体验，与现有`generateStream`模式一致。

### 4.3 新增streamChunks而非复用relaySSE
`relaySSE`发`{content}`格式并在结束时发`[DONE]`，但押题协议要求`{type:'content',content}`且步骤4结束后还需发step-done事件再发`[DONE]`。新增`streamChunks(upstream, handlers)`是更底层原语——只读流按回调吐chunk，不写SSE格式不发`[DONE]`，由predictController控制事件格式。`relaySSE`保持不动（精准修改原则）。

### 4.4 面经检索独立mianjingStore.js
`data/index.js`的`readJSON`用`path.join(DATA_DIR, filename)`仅支持直属文件。面经在`data/mianjing/`子目录下，且需跨多文件聚合+关键词评分。独立模块职责清晰，控制器只调`searchMianjing(keywords)`。

## 五、文件清单（作用+预估行数）

### 后端新增

| 文件 | 作用 | 预估行数 |
|------|------|---------|
| `data/mianjing/ai-engineering.json` | AI工程面经(multi-agent/AST/Prompt/CI-CD/MCP) 15题 | ~180 |
| `data/mianjing/nodejs.json` | Node.js面经(事件循环/Stream/模块/中间件) 15题 | ~180 |
| `data/mianjing/python.json` | Python面经(GIL/装饰器/asyncio/API) 8题 | ~100 |
| `data/mianjing/fullstack.json` | 全栈手写题(EventEmitter/Promise.all/防抖节流等) 12题 | ~150 |
| `data/mianjingStore.js` | 读取mianjing/*.json聚合+关键词匹配评分+返回topN | ~40 |
| `controllers/predictPrompt.js` | 3个build函数(JD解读/简历分析/押题生成) | ~100 |
| `controllers/predictController.js` | 4步SSE编排:sendStep/runStep1-4/主入口 | ~90 |
| `routes/predict.js` | `POST /stream` auth+validateBody | ~12 |

### 后端修改

| 文件 | 改动 | 增加行数 |
|------|------|---------|
| `services/deepseekService.js` | 新增`streamChunks()`导出(不改现有函数) | +28 |
| `app.js` | `app.use('/api/predict', require('./routes/predict'))` | +2 |

### 前端新增

| 文件 | 作用 | 预估行数 |
|------|------|---------|
| `api/predict.js` | `predictStream(params, onMessage, onError)` 封装createSSE | ~10 |
| `composables/usePredict.js` | 状态=currentStep/loading/error/stepResults/predictContent 方法=start/stop/reset | ~85 |
| `constants/predictDefault.js` | 预填JD文本+简历经历模板 | ~35 |
| `views/Predict.vue` | 输入表单+el-steps进度+结果区+押题markdown渲染 | ~140 |
| `views/PredictStepResult.vue` | 步骤1-3结构化结果渲染(tags列表/真题列表) | ~80 |
| `styles/predict.css` | 押题页样式(外置降低vue行数) | ~60 |

### 前端修改

| 文件 | 改动 | 增加行数 |
|------|------|---------|
| `router/index.js` | import Predict + route配置 | +5 |
| `App.vue` | import图标 + 侧边栏菜单项 | +5 |

## 六、SSE消息协议

### 请求
```
POST /api/predict/stream
Headers: Content-Type: application/json, Authorization: Bearer <token>
Body: { position, company, jd, resume }
Response: text/event-stream
```

### 消息时序（正常流程）
```
:connected                                    ← initSSE()连接确认

data: {"type":"step","step":1,"status":"start"}
data: {"type":"step","step":1,"status":"done","data":{"position":"...","keySkills":[...],"testFocus":[...],"keywords":[...]}}

data: {"type":"step","step":2,"status":"start"}
data: {"type":"step","step":2,"status":"done","data":{"matchingSkills":[...],"gaps":[...],"keywords":[...]}}

data: {"type":"step","step":3,"status":"start"}
data: {"type":"step","step":3,"status":"done","data":{"questions":[{id,question,tags,difficulty,answer},...]}}

data: {"type":"step","step":4,"status":"start"}
data: {"type":"content","content":"# 押题\n\n## 题1: "}
data: {"type":"content","content":"..."}       ← 多次流式
data: {"type":"step","step":4,"status":"done"}

data: [DONE]
```

### 消息类型

| type | 字段 | 说明 |
|------|------|------|
| `step` | step(1-4), status("start"/"done"), data(可选) | 步骤进度，done时携带结构化结果 |
| `content` | content(string) | 步骤4流式押题文本片段 |
| `error` | error(string) | 错误信息，随后紧跟`[DONE]` |
| `status` | status("done") | 前端sse.js将`[DONE]`转换而来，触发finalize |

### 前端onMessage处理逻辑
- `type==='step'`：更新currentStep；status==='done'时存储stepResults[step]
- `type==='content'`：predictContent += content
- `type==='status' && status==='done'`：loading=false（finalize）
- `type==='error'`：error=消息, loading=false

## 七、面经数据Schema

```json
{
  "id": "ai-001",
  "category": "ai-engineering",
  "question": "什么是Multi-Agent协作架构？请描述代码生成Agent和测试Agent如何协作。",
  "tags": ["multi-agent", "agent协作", "代码生成Agent", "测试Agent"],
  "difficulty": "hard",
  "type": "open",
  "source": "AI编程岗位高频题",
  "answer": "Multi-Agent协作架构是指多个专业化Agent分工协作..."
}
```

### 检索算法(mianjingStore.js)
拼接`question+tags+answer`为匹配文本，统计命中关键词数，按命中数降序取topN(默认12)。每次请求读取文件（无模块级缓存，避免状态泄露）。

## 八、面经题库规划（50题）

### ai-engineering.json（15题）
multi-Agent协作架构 / Review-Refactor Agent设计 / AST原理与Lint规则实现 / 静态分析正则vs AST / Prompt结构化设计 / Few-shot vs Zero-shot / CI/CD+AI流水线集成 / MCP协议与REST区别 / Agent决策循环(observe→think→act) / GPT-Claude-DeepSeek API调用 / AI生成JSON不稳定处理 / AST遍历节点类型 / Function Calling原理 / Agent质量评估 / 多Agent上下文传递方案

### nodejs.json（15题）
事件循环6阶段 / async-await非阻塞原理 / nextTick-Promise-setTimeout-setImmediate顺序 / Stream推拉模式 / Buffer原理 / CommonJS require加载6步 / CommonJS vs ESM / Express中间件next() / res.json后不return / 同步vs异步IO / JSON并发写入竞态 / 单线程高并发 / 模块缓存Module._cache / EventEmitter实现 / 全局对象

### python.json（8题）
GIL原理 / 装饰器手写 / asyncio事件循环 / 生成器与yield / 调用OpenAI/DeepSeek API / with上下文管理器 / asyncio vs Node事件循环对比 / 类与继承

### fullstack.json（12题，闭卷手写）
手写EventEmitter / 手写Promise.all / 手写防抖节流 / 手写深拷贝(循环引用) / 手写发布订阅 / 手写call-apply-bind / 手写AST遍历器 / 手写Agent调度器 / 手写Promise串行 / 手写LRU缓存 / 手写fetch / 手写Lint检查函数

## 九、实施步骤（按依赖顺序）

### 阶段一：后端数据层+服务层
1. 创建`backend/data/mianjing/` 4个JSON文件 — 填入50题，每条含完整answer
2. 创建`backend/data/mianjingStore.js` — loadAll+searchMianjing+countMatches
3. 修改`backend/services/deepseekService.js` — 新增streamChunks导出（修改前后调code-guardian:full_health_check）
4. 创建`backend/controllers/predictPrompt.js` — 3个build函数

### 阶段二：后端控制器+路由
5. 创建`backend/controllers/predictController.js` — 4步编排
6. 创建`backend/routes/predict.js` — `router.post('/stream', auth, validateBody(...), streamPredict)`
7. 修改`backend/app.js` — 注册路由

### 阶段三：前端API+Composable（api→composable顺序）
8. 创建`frontend/src/api/predict.js` — predictStream封装
9. 创建`frontend/src/composables/usePredict.js` — 状态管理
10. 创建`frontend/src/constants/predictDefault.js` — 预填常量

### 阶段四：前端视图
11. 创建`frontend/src/views/PredictStepResult.vue` — 步骤结果子组件
12. 创建`frontend/src/styles/predict.css` — 样式外置
13. 创建`frontend/src/views/Predict.vue` — 主页面
14. 修改`frontend/src/router/index.js` — +/predict路由
15. 修改`frontend/src/App.vue` — 侧边栏菜单项（用Aim图标，放在AI助手下方）

## 十、验证步骤

### P0（必须通过）
| 检查项 | 验证方式 |
|--------|---------|
| 视图层无直接API调用 | Predict.vue无fetch/axios/import createSSE，只调usePredict |
| async函数try-catch | predictController.streamPredict有try-catch；usePredict有onError |
| 资源清理 | usePredict的onUnmounted调stop()中断SSE |
| 无模块级状态变量 | mianjingStore无let cache；usePredict状态在ref中 |
| ESLint 0 Error | 全部新增/修改文件 |

### P1（文件规模）
| 文件 | 上限 | 预估 |
|------|------|------|
| Predict.vue | 200 | ~140 |
| PredictStepResult.vue | 200 | ~80 |
| usePredict.js | 150 | ~85 |
| predictController.js | 150 | ~90 |
| predictPrompt.js | 150 | ~100 |
| mianjingStore.js | 150 | ~40 |
| deepseekService.js | 150 | 80+28=108 |

### P2（合规性）
- 无重复代码：streamChunks是新原语，relaySSE未改；prompts不重复
- SSE合规：Predict.vue→usePredict→api/predict→createSSE，视图层不碰HTTP
- 注释规范：每文件有文件头注释；函数有注释；复杂逻辑有行内注释
- 路由注册：app.js新增/api/predict；router新增/predict

### 端到端验证
1. 启动后端+前端dev server
2. 登录后访问/predict，确认JD已预填
3. 点击"开始押题"，观察el-steps逐步推进(1→2→3→4)
4. 步骤1-3完成后查看结构化结果（技能列表/差距/真题）
5. 步骤4流式渲染押题markdown内容
6. 点击"停止生成"验证SSE中断无报错
7. 对所有修改文件调code-guardian:full_health_check

## 十一、风险与应对

| 风险 | 应对 |
|------|------|
| 步骤1/2非流式等待较长 | 已发step start事件让用户看到进度；timeout设45s |
| repairJSON解析失败 | catch捕获后发error事件，前端显示错误不崩溃 |
| 步骤4客户端断开时上游流未销毁 | streamChunks返回destroy函数 |
| 面经检索无匹配 | 返回空数组，步骤4仍能基于JD+简历生成 |
| Predict.vue超200行 | 外置CSS+拆PredictStepResult子组件双重保障 |

## 十二、假设与决策

1. **预填JD**：将用户提供的AI编程实习生JD预填到输入框，用户可编辑。简历提供模板（含用户薄弱点标注），用户编辑为真实经历。
2. **面经数据来源**：从网络调研真实面试题，人工curate为结构化JSON（非爬取牛客，避免ToS风险+数据质量可控）。
3. **通用工具+即时价值**：工具设计为通用（任何JD可用），但预填用户的特定JD提供即时价值。
4. **DeepSeek模型**：复用现有`deepseek-v4-flash`模型配置，不改deepseekService的callDeepSeek参数。
5. **暗黑模式**：predict.css中包含暗黑模式适配（html.dark选择器），与现有dark.css模式一致。
