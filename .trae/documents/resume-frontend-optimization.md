# 简历优化计划（前端方向）

## 目标

根据大佬的6条反馈，重写简历，突出前端技术深度，去掉AI味和全栈描述，让简历更像真人写的。Code Guardian 单独作为第二个项目包装。

## 大佬反馈总结（6张图）

| # | 反馈 | 核心问题 |
|---|------|---------|
| 1 | 个人信息缺电话和邮箱 | 基础信息不完整 |
| 2 | 技能描述太简单，HR看不懂，缺Vite/Webpack/npm等主流技能 | 技能展示不够详细 |
| 3 | 参考样例：按类别详细写（前端基础/框架与生态/工程化/全栈与网络/计算机基础） | 技能分类框架 |
| 4 | 项目描述后端/运维太多，前端岗位要弱化后端，用「项目背景→技术栈→主要职责→项目成果」框架 | 项目描述框架 |
| 5 | 只有开源项目，没有实习经历，公司看重企业级项目 | 缺乏实习经历（短期无法改变） |
| 6 | 简历优化效果有限，核心是缺实习 | 优化有上限，但必须做 |

## 项目实际使用的前端技术（从代码中提取）

### 项目一：面试宝典（前端应用）

**框架与库：**
- Vue 3 — Composition API + `<script setup>`，9个路由页面
- Vue Router 4 — history模式、路由守卫、query参数传递
- Pinia — 状态管理（user store，JWT token持久化）
- Element Plus — UI组件库（20+组件）
- ECharts 6 — 数据可视化（折线图/柱状图/雷达图）
- Axios — HTTP客户端（拦截器、JWT自动注入、401自动跳转）
- Vite 5 — 构建工具（开发服务器、API代理）

**前端工程能力：**
- SSE流式传输 — EventSource + 三层容错（自动重连→降级非流式→渲染控频）
- 暗黑模式 — localStorage持久化 + `html.dark` class切换
- 响应式适配 — CSS media queries（768px/480px双断点）
- 键盘快捷键 — 方向键切题、数字键选答案、Enter确认
- JSON修复引擎 — 多策略解析AI返回的不稳定JSON
- Token预算管理 — 按token预算裁剪历史消息
- Composables模式 — useTimer/useQuiz/useAiChat/useDarkMode
- API分层 — request.js → sse.js → 业务API模块

### 项目二：Code Guardian（前端工程化工具）

**实际代码结构（从文件系统中提取）：**
```
code-guardian/
├── index.js                    # 入口（JSON-RPC 2.0 over stdio）
├── package.json                # npm包配置
├── README.md                   # 650+行完整文档
├── tools/                      # 6个检查工具
│   ├── check_file_size.js      # 文件大小检查（glob匹配）
│   ├── run_eslint.js           # ESLint集成
│   ├── validate_architecture.js # 架构分层检查
│   ├── detect_anti_patterns.js  # 反模式扫描（入口）
│   ├── check_comment_compliance.js # 注释规范检查
│   ├── full_health_check.js    # 一键聚合检查
│   └── lib/                    # 8个独立检测器
│       ├── config-loader.js           # 配置加载 + glob匹配引擎
│       ├── function_body.js           # 函数体提取
│       ├── direct_api_detector.js     # 视图层直接API调用检测
│       ├── long_transform_detector.js # 组件内长数据转换检测
│       ├── bare_async_detector.js     # 裸async无catch检测
│       ├── resource_leak_detector.js  # 资源未清理检测
│       ├── module_state_detector.js   # 模块级状态变量检测
│       └── duplicate_code_detector.js # 重复代码块检测
└── __tests__/                  # 单元测试
    ├── check_file_size.test.js
    ├── validate_architecture.test.js
    └── detect_anti_patterns.test.js
```

**技术要点：**
- Node.js + JSON-RPC 2.0协议（不写MCP，HR看不懂）
- glob模式匹配引擎（自实现，不依赖第三方库）
- 正则表达式代码分析（8个检测器）
- 配置驱动（.code-guardian.json）
- 四层防御体系：AI主动调用 → 文件写入后自动触发 → 手动触发 → git提交前拦截
- 已发布至npm（code-guardian）
- 18个单元测试用例

## 修改方案

### 1. 个人信息
- ✅ 添加电话：15260541393
- ✅ 添加邮箱：1368664507@qq.com
- ✅ 保留：GitHub、掘金、在线演示地址
- ✅ 添加「可实习3-6个月，每周5天，随时到岗」

### 2. 专业技能（重写，按类别详细展开）

```
专业技能

• 前端基础：熟练掌握 HTML5 / CSS3 / JavaScript(ES6+)，熟悉 TypeScript 基础语法，
  能独立完成语义化页面搭建与响应式布局（双断点适配平板/手机）

• 框架与生态：熟练使用 Vue3（Composition API + <script setup>）进行组件化开发，
  熟悉 Vue Router 4（路由守卫、动态路由）、Pinia 状态管理、Element Plus 组件库；
  了解 React 基础，有 Ant Design Vue 开源贡献经验（PR #8563 已合并）

• 工程化与构建：熟悉 Vite 构建工具配置（开发服务器、API代理、生产构建），
  了解 Webpack 基础配置；熟悉 npm 包管理与发布；使用 ESLint + Husky 实现提交前自动代码检查

• 数据可视化：熟练使用 ECharts 6 实现折线图、柱状图、雷达图等多图表联动展示，
  支持暗黑模式动态配色切换

• AI 前端交互：熟悉 SSE（Server-Sent Events）流式传输方案，独立实现 AI 流式对话功能，
  设计三层容错机制（自动重连 → 降级非流式 → 渲染控频），稳定性达 99.5%

• 代码质量工具：独立开发 Code Guardian 前端代码质量检查工具（npm 开源包），
  实现 6 个检查维度和 8 个检测器，支持配置驱动和 glob 模式匹配

• 后端基础：了解 Node.js / Express，能独立完成 RESTful API 设计与 JWT 认证对接；
  了解 Nginx 反向代理配置、PM2 进程管理
```

### 3. 项目经历（两个项目）

#### 项目一：面试宝典

```
项目经历

面试宝典 — AI 面试刷题助手    2026.05 — 至今
独立开发 | 线上地址：http://8.138.219.100

项目背景：针对传统刷题平台缺乏个性化辅导的问题，独立开发一款支持 AI 自动出题、
实时解析、错题管理的面试刷题工具，已部署至阿里云并持续迭代。

技术栈：Vue3 + Vue Router 4 + Pinia + Element Plus + ECharts 6 + Axios + Vite 5 + SSE

主要职责：
• 独立完成 9 个页面组件开发，采用 Composables 模式将业务逻辑与视图解耦
  （useTimer / useQuiz / useAiChat / useDarkMode），提升代码可维护性
• 实现 SSE 流式对话功能，前端通过 EventSource 接收 AI 实时响应，
  设计三层容错机制处理网络超时和数据异常，确保对话稳定性
• 开发 JSON 修复引擎，多策略解析 AI 返回的不稳定 JSON
  （提取 → 修复非法转义/尾随逗号/未闭合括号 → 规范化题目对象），解决 AI 输出格式不稳定的问题
• 实现 ECharts 统计仪表盘，折线图/柱状图/雷达图三图联动，支持暗黑模式动态配色
• 实现响应式布局（768px/480px 双断点）和键盘快捷键（方向键切题、数字键选答案）

项目成果：
• 项目已上线并持续迭代，GitHub 开源，掘金发布 3 篇技术文章（累计 20KB+）
• 向 ant-design-vue（21k+ stars）提交 PR #8563，修复主题切换时通知组件样式丢失问题
```

#### 项目二：Code Guardian（新增，单独包装）

```
Code Guardian — 前端代码质量自动检查工具    2026.05 — 至今
独立开发 | npm 开源包：code-guardian

项目背景：在使用 AI 辅助开发过程中，发现 AI 生成的代码经常违反团队编码规范
（文件超行、架构分层违规、资源未清理等），手动 Review 效率低且容易遗漏。
因此开发了自动化的代码质量检查工具，集成到 AI 编码工作流中。

技术栈：Node.js + JSON-RPC 2.0 + glob 模式匹配 + 正则表达式代码分析

主要职责：
• 设计 6 个检查维度（文件大小 / ESLint / 架构分层 / 反模式 / 注释规范 / 一键聚合），
  覆盖前端开发常见质量问题
• 开发 8 个独立检测器模块（裸async检测 / 资源泄露检测 / 直接API调用检测 /
  长数据转换检测 / 模块级状态检测 / 重复代码检测等），基于正则表达式和代码结构分析
• 自实现 glob 模式匹配引擎，支持按文件类型和路径模式匹配不同检查规则，
  团队可通过配置文件自定义行数上限、分层规则、反模式开关
• 设计四层防御体系：AI 主动调用 → 文件写入后自动触发 → 手动触发 → git 提交前拦截，
  确保代码质量检查不会遗漏
• 发布至 npm，编写完整文档（650+ 行），支持 Claude Code / Trae / Cursor / Windsurf
  等主流 AI 编码助手

项目成果：
• 已发布至 npm（code-guardian），GitHub 开源
• 编写单元测试 18 个用例，覆盖 3 个核心检测模块
• 在实际项目中持续使用，有效降低 AI 生成代码的质量问题
```

### 4. 教育背景（保持不变）
```
教育背景
闽南科技学院    网络工程 · 本科    2023 — 2027
主修课程：数据结构、数据库原理、网络爬虫、Python、C++
```

### 5. 证书（保持不变）
```
证书
CET-4 · 大学英语四级
```

### 6. 删除内容
- ❌ 删除「掘金：会赢吗家人们」（昵称不专业）
- ❌ 删除「MCP」相关描述（HR看不懂，面试时再讲）
- ❌ 删除「Spec Coding」「知识飞轮」「verify-refactor」
- ❌ 删除「双 AI 交叉验证工作流」
- ❌ 删除「code-guardian npm 包」在项目一成果中的描述（移到项目二）

### 7. 添加内容
- ✅ 添加电话和邮箱
- ✅ 添加「可实习3-6个月，每周5天，随时到岗」
- ✅ Code Guardian 单独作为第二个项目

## Code Guardian 包装策略

### 为什么不写 MCP？
- HR 不认识 MCP，看到会困惑
- 技术面试官会问，面试时再讲是加分项
- 简历上写「JSON-RPC 2.0」更通用，面试官都懂

### 为什么单独作为项目？
- 原来放在项目一的「成果」里，太不起眼
- 单独写能展示：工具开发能力、npm发布经验、文档写作能力
- 这是前端工程化能力的直接体现

### 包装重点
1. **解决什么问题** — AI生成代码质量不稳定，需要自动化检查
2. **怎么解决的** — 6个检查维度 + 8个检测器 + glob匹配 + 四层防御
3. **有什么成果** — npm发布、18个测试用例、实际项目使用

### 面试时的加分话术
- "这个工具的核心是 glob 模式匹配引擎，我自己实现的，没有用第三方库"
- "四层防御体系的设计思路是：不能只依赖一个检查点，要层层兜底"
- "8个检测器都是独立的模块，方便扩展新的检查规则"

## 输出文件

| 文件 | 说明 |
|------|------|
| `resume-xueca/resume-xueca-v8.docx` | 修改后的Word简历 |
| `resume-xueca/resume-xueca-v8.pdf` | 修改后的PDF简历 |

## 验证步骤

1. 打开Word/PDF，检查是否去掉了所有AI味词汇
2. 检查电话和邮箱是否已添加
3. 检查技能描述是否按类别详细展开（7个类别）
4. 检查是否有两个项目（面试宝典 + Code Guardian）
5. 检查项目描述是否用「背景→技术栈→职责→成果」框架
6. 检查 Code Guardian 是否没有写 MCP
7. 检查是否弱化了后端/运维内容
8. 检查是否突出了前端技术深度
