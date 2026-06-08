# 项目实时状态 — 面试宝典（Interview Handbook）

> 最后更新：2026-06-08 | 更新触发：Day23 响应式适配完成（含 scoped 特异性 + hamburger 图标修复）
> 关联文件：执行手册v3.4.md、.trae/rules/、.trae/skills/

------

## 🔒 已完成的模块

### Week1：基础框架 + 用户认证 + 题库 ✅ 全部完成
- **项目初始化**：Vue3 + Vite + Element Plus + Pinia + Vue Router
- **后端骨架**：Express + JSON文件存储 + CORS（端口5000）
- **用户认证**：注册 / 登录 / JWT鉴权 / 路由守卫
- **题库管理**：50道题 / 分类筛选 / 难度筛选 / 关键词搜索 / 分页
- **核心文件**：
  - `frontend/src/views/Login.vue` — 登录注册页
  - `frontend/src/views/QuestionBank.vue` (165行) — 题库列表 + 筛选 + 开始答题
  - `frontend/src/composables/useQuestionBank.js` (78行) — 题库筛选+分页逻辑
  - `backend/controllers/authController.js` (101行) — 用户认证
  - `backend/controllers/questionController.js` (78行) — 题库接口
  - `backend/data/questions.json` — 50道预置题目

### Week2：答题核心流程 + 统计 ✅ 全部完成
- **答题页面**：逐题作答 / 答题卡跳转 / 倒计时 / 提交
  - `frontend/src/views/Quiz.vue` (157行) — 答题页（结果页内嵌）
  - `frontend/src/composables/useQuiz.js` — 答题业务逻辑
  - `frontend/src/composables/useTimer.js` — 倒计时逻辑
- **错题本**：错题回顾 / 展开解析 / 重新作答 / 导出 / 批量重答 / 标记 / 三次答对自动移除
  - `frontend/src/views/WrongBook.vue` (145行)
  - `frontend/src/composables/useWrongBook.js` (106行)
- **统计仪表盘**：数据卡片 + ECharts图表 + 薄弱知识点 + 暗黑模式适配
  - `frontend/src/views/Dashboard.vue` (174行) — 4卡片 + 3图表 + 快速开始 + 暗黑配色
  - `backend/controllers/recordController.js` (107行) — 统计/错题/标记/连续正确接口
- **约束合规**：全部文件 ≤200行 ✅

### Week3：AI功能（后端）✅ 已完成
- **AI出题**：DeepSeek API 调用 / 题目生成 / JSON解析
  - `backend/controllers/aiController.js` (150行) — 核心AI逻辑
  - `backend/controllers/aiPrompt.js` — systemPrompt常量
  - `backend/controllers/aiParser.js` — JSON修复 + 流式解析
- **SSE流式输出**：4个接口全部注册
  - `POST /api/ai/generate` — 非流式出题
  - `POST /api/ai/generate/stream` — SSE流式出题
  - `POST /api/ai/chat` — 非流式对话
  - `POST /api/ai/chat/stream` — SSE流式对话
- **前端API层**：
  - `frontend/src/api/ai.js` (18行) — AI接口封装
  - `frontend/src/api/sse.js` (46行) — SSE流式请求封装

### Week3：AI功能（前端）✅ 已完成（Day17-20）
- **AiChat.vue** (188行) — AI对话页：消息列表 + 快捷出题 + 三态渲染（thinking/generating/question·text）
- **useAiChat.js** (147行) — AI对话业务逻辑：SSE流式 + localStorage持久化 + token裁剪 + 三层容错降级
- **AiQuestionCard.vue** (42行) — AI题目格式化卡片 + 「加入题库」按钮
- **utils/markdown.js** (26行) — 极简markdown渲染（代码块+加粗，含XSS转义）
- **路由 + 菜单**：`/ai-chat` 已注册，App.vue 侧边栏「AI助手」已接入
- **加入题库闭环**：`POST /api/questions`（第15个接口）— AiQuestionCard → api/questions.createQuestion → questionController 落盘

------

## 🚧 进行中的模块

> **Day24 交互细节 — 计划已就绪，待实现**
> 计划文件：`C:\Users\Administrator\.claude\plans\day24-interaction-polish.md`
> 新对话直接说「按 plans 里的 day24 计划实现」即可衔接。涉及 5 个文件：
> 1. `Dashboard.vue` — watch(isDark) 加 dispose 防泄漏（清 Day23 技术债）+ `v-loading` + watch error 弹 Toast
> 2. `stores/record.js` — fetchStats 加 error 捕获并 return error
> 3. `Quiz.vue` — 键盘快捷键（←→ 切题 / 1-5 选答案）+ onUnmounted 清理
> 4. `useQuestionBank.js` — 自写 debounce + handleFilterDebounced（搜索防抖 300ms）
> 5. `QuestionBank.vue` — keyword input 接 `@input="handleFilterDebounced"`
> 全部文件改后仍在行数限制内。

------

## 📋 待开发模块清单

### Week4 Day22 — 暗黑模式 ✅ 已完成
- [x] **Element Plus 暗黑CSS**：引入 `theme-chalk/dark/css-vars.css`
- [x] **自定义暗黑变量**：`styles/dark.css`（背景/文字/边框/卡片色）
- [x] **暗黑切换按钮**：App.vue 侧边栏底部 + localStorage 持久化
- [x] **ECharts 图表适配**：Dashboard.vue 动态配色（标题/轴线/分割线/标签）
- [x] **全页面暗黑样式**：Login/Quiz/Dashboard/AiChat/WrongBook/QuestionBank

### Week4 Day23 — 响应式适配 ✅ 已完成
- [x] **媒体查询双断点**：`styles/responsive.css`（768px 平板 + 480px 手机）
- [x] **侧边栏汉堡菜单**：App.vue 移动端隐藏侧边栏 + 顶部 hamburger 按钮 + 遮罩层
- [x] **Element Plus 栅格重排**：Dashboard 4卡→2卡→1卡 / Quiz 答题卡移到题目下方
- [x] **手机端大触摸区域**：Quiz 选项 padding+字号、答题卡格子放大
- [x] **修复 scoped 特异性**：所有跟 view scoped 冲突的响应式属性补 `!important`（main-content/answer-card/option-item/option-label/option-text/card-item/message.user/message.assistant/page-header）
- [x] **修复 hamburger 图标**：App.vue 直接 import Close/Expand 组件，:icon 传组件引用而非字符串

### Week4 — 打磨 + 响应式 + 安全加固
- [ ] **交互细节**（Day24）/ **个人中心**（Day25）
- [ ] **Bug修复 + 登录注册安全加固**（Day26）：用户名/密码校验、速率限制、统一错误提示

### Week5 — 部署上线
- [ ] **部署**：阿里云 / Nginx / PM2 / SSE 生产环境 `proxy_buffering off`

------

## 🔗 跨模块接口契约

### 契约1：Auth → 所有需要登录的模块
- 调用方式：`stores/user.js` 的 `token` 状态
- 接口：`api/request.js` 拦截器自动附加 Header
- **不准绕过此契约直接传token**

### 契约2：Questions → Quiz
- 调用方式：`stores/questions.js` 的 `currentDetail`
- 入参：题目ID
- 返回：题目对象 `{ id, title, options, category, difficulty }`
- **不准绕过此契约直接调用questions API**

### 契约3：Quiz → Records
- 调用方式：`api/records.js` 的 `submitQuiz()`
- 入参：`{ answers, score, timeUsed, questionIds }`
- 返回：`{ recordId, stats }`
- **不准绕过此契约直接操作records数据**

### 契约4：Records → Dashboard
- 调用方式：`api/records.js` 的 `getStats()`
- 返回：`{ totalQuizzes, avgScore, totalTime, categoryStats }`
- **Dashboard只能读stats，不能改records**

------

## 🐛 已知技术债

> 无严重技术债。以下为后续优化项：
> - Quiz.vue 中结果展示与答题逻辑在同一文件，但157行仍合规
> - 登录注册缺少安全校验（用户名格式/密码强度/速率限制），Week4处理
> - **ESLint 遗留 error 已清零**（2026-06-07 Day21）：composable 的 `max-lines-per-function` 已在 eslint.config.js 中豁免（工厂函数模式），`no-unused-vars` 已修复。WrongBook.vue 仍有 61 个 vue 模板格式 warning（不影响功能）
> - 后端 `check-size` 已全部通过（11 文件）
> - **Dashboard.vue `watch(isDark)` 切换暗黑时直接调 initCharts() 不 dispose 旧 ECharts 实例**（2026-06-08 Day23 校验发现）：实际页面不影响功能，仅内存浪费 + 控制台 warning，Day24 交互细节阶段统一改为先 dispose 再 init 或 setOption 增量更新颜色

------

## 📋 已决策事项

| ID | 问题 | 决策 | 日期 |
|----|------|------|------|
| D-001 | Dashboard统计图表用ECharts还是Chart.js？ | ECharts ✅ | Week2 Day13 |
| D-002 | AI出题接口用流式(SSE)还是非流式？ | 两者都支持 ✅ | Week3 Day15-16 |
| D-003 | Stats.vue与Dashboard.vue功能重合 | 删除Stats.vue，统计归Dashboard | 2026-06-06 |
| D-004 | AI出题卡片渲染与markdown放组件还是view？ | 拆 AiQuestionCard.vue + utils/markdown.js，保 AiChat.vue ≤200行 | 2026-06-07 |
| D-005 | AI题目「加入题库」走哪个接口？ | 新增 POST /questions（第15接口），复用题库落盘 | 2026-06-07 |
| D-006 | composable的max-lines-per-function偏严？ | eslint.config.js中为composables目录关闭此规则（工厂函数模式） | 2026-06-07 |
| D-007 | 暗黑模式实现方案？ | Element Plus内置dark CSS + html.dark class + 自定义dark.css覆盖 | 2026-06-07 |
| D-008 | 响应式样式被 scoped 特异性锁死如何修？ | 在 responsive.css 中对所有冲突属性加 `!important`（最小改动，不动 view 文件） | 2026-06-08 |

------

## 🛑 禁区清单

> - `backend/middleware/auth.js` 的 JWT验证逻辑
> - `frontend/src/api/request.js` 的拦截器链
> - `backend/data/index.js` 的读写锁逻辑
> - 已完成的模块接口签名

------

## 🎯 下一步行动

1. **Week4 Day24**：交互细节（Loading/空状态/错误状态/键盘快捷键/Toast/防抖）+ 顺手清理 Dashboard echarts dispose 技术债
2. **Week4 Day25**：个人中心
3. **Week4 Day26**：Bug修复 + 登录注册安全加固