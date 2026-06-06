# 项目实时状态 — 面试宝典（Interview Handbook）

> 最后更新：2026-06-05 | 更新触发：回退到 `8d6416e`（初始化项目），从零开始重建
> 关联文件：执行手册v3.0.md、.trae/rules/、.trae/skills/
> ⚠️ **注意**：当前为**空项目状态**，所有模块待开发。以下接口契约作为设计蓝图，供开发时参考。

------

## 🔒 已完成的模块

### 模块：答题流程（Quiz）— 优化版
- 状态：✅ 已完成（2026-06-06 优化：从单题答题改为整组答题）
- 文件清单：
  - `frontend/src/views/QuestionBank.vue` (196行) — 题库列表 + 筛选 + 「开始答题」按钮
  - `frontend/src/views/Quiz.vue` (157行) — 答题页面（多题逐题展示）
  - `frontend/src/composables/useQuiz.js` (98行) — 答题业务逻辑（支持 `?ids` 批量加载）
  - `frontend/src/composables/useTimer.js` (54行) — 倒计时逻辑
  - `frontend/src/utils/stats.js` (71行) — 答题统计工具
- **关键优化**：
  - 筛选后点击「开始答题」→ 当前列表全部题目进入答题模式
  - 支持逐题作答、答题卡跳转、上下题切换
  - 单题入口保留（点击「查看详情」）
- **约束合规**：
  - QuestionBank.vue ≤200行 ✅
  - useQuiz.js ≤150行 ✅
  - 无直接 fetch/axios ✅
  - async 有 try-catch ✅

------

## 🚧 进行中的模块（无）

------

## 📋 待开发模块清单（按Week顺序）

### Week1 — 基础框架 + 用户认证 + 题库
- [ ] **项目初始化**：Vue3 + Vite + Element Plus + Pinia + Vue Router
- [ ] **后端骨架**：Express + JSON文件存储 + CORS
- [ ] **用户认证**：注册 / 登录 / JWT鉴权 / 路由守卫
- [ ] **题库管理**：题目列表 / 搜索筛选 / 收藏 / 题目详情

### Week2 — 答题流程 + 统计
- [ ] **答题页面**：选题 / 计时 / 答题 / 提交
- [ ] **答题结果**：分数统计 / 正确率 / 用时分析
- [ ] **错题本**：错题回顾 / 标记正确 / 分类筛选
- [ ] **仪表盘**：学习统计 / 图表可视化

### Week3 — AI刷题助手（核心亮点）
- [ ] **AI出题**：DeepSeek API 调用 / 题目生成 / JSON解析
- [ ] **SSE流式输出**：实时显示AI生成内容 / 三段式数据流
- [ ] **AI对话**：聊天式刷题 / 上下文管理 / Token溢出处理
- [ ] **错误降级**：重试 / 切非流式 / 用户提示

### Week4 — 优化 + 部署
- [ ] **性能优化**：懒加载 / 缓存 / 代码分割
- [ ] **部署**：阿里云 / Nginx / PM2

------

## 🔗 跨模块接口契约（设计蓝图，开发时遵守）

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

## 🐛 已知技术债（无）

> 空项目，无技术债。后续随开发逐步记录。

------

## 📋 待决策事项

| ID | 问题 | 上下文 | 决策截止 |
|----|------|--------|---------|
| D-001 | Dashboard统计图表用ECharts还是Chart.js？ | 执行手册说ECharts，但需确认版本 | Week2 Day12 |
| D-002 | AI出题接口用流式(SSE)还是非流式？ | 执行手册说SSE，但需评估稳定性 | Week3 Day15 |

------

## 🛑 禁区清单（开发时逐步建立）

> 空项目，暂无禁区。以下区域开发完成后加入：
> - `backend/middleware/auth.js` 的 JWT验证逻辑
> - `frontend/src/api/request.js` 的拦截器链
> - `backend/data/index.js` 的读写锁逻辑
> - 已完成的模块接口签名

------

## 📁 当前目录结构（空项目）

```
interview-handbook/
├── frontend/              # Vue3 + Vite（初始化状态）
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/               # Express（初始化状态）
│   └── app.js
├── .trae/                 # 约束体系（已建立）
│   ├── rules/             # 5个规则文件
│   └── skills/            # 3个技能文件
├── PROJECT_STATE.md       # 本文件
└── package.json           # 根级package.json
```

------

## 🎯 下一步行动

1. **Week1 Day1**：初始化前端项目（Vue3 + Vite + Element Plus + Pinia + Vue Router）
2. **Week1 Day2**：搭建后端Express骨架 + JSON文件存储
3. **每完成一个模块**：更新本文件，将模块移入「已完成的模块」
