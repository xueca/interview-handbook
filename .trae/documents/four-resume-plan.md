# 四方向专精简历制作方案

## 目标
基于用户简历信息和项目文件，制作4份不同方向的专精简历（HTML + Word），每份突出不同能力维度。

## 用户基本信息（来自上次会话）
- 姓名：刘泽祥
- 学校：闽南科技学院（27届，2027年毕业）
- 专业：网络工程
- 证书：CET-4
- GitHub：xueca
- 掘金：xxxccca（2篇文章：Spec Coding实践 + 开发踩坑记录）
- 开源贡献：ant-design-vue PR #8563（Open状态）
- npm包：code-guardian（MCP Server）
- 实习意向：可实习3-6个月，每周5天，随时到岗

## 输出文件

```
resume-xueca/
  assets/photo.jpg              (从上次会话的简历中提取或重新引用)
  resume-frontend.html + .docx  (前端开发)
  resume-nodejs.html + .docx    (Node.js开发)
  resume-fullstack.html + .docx (全栈开发)
  resume-testdev.html + .docx   (测试开发)
```

## 项目数据（已从代码验证）

### 面试宝典（全栈项目）
- **后端**：Express 5 + JWT认证 + 中间件链
  - auth路由：5个接口（register/login/me/password/username）
  - questions路由：4个接口（list/detail/create/delete）
  - records路由：6个接口（submit/records/stats/wrong/mark/marks）
  - ai路由：4个接口（generate/generateStream/chat/chatStream）
  - 中间件：auth(JWT) + captureRawBody + rateLimit + validateBody + 自定义JSON parser
  - 总计：19个REST API
- **前端**：Vue3 + Composition API + Element Plus + Pinia + ECharts
  - 9个页面组件
  - Composables模式（useQuestionBank/useStats等）
  - ECharts三图联动
  - SSE流式接收AI出题/聊天
- **部署**：阿里云ECS + Nginx + PM2

### Code Guardian（MCP Server）
- 6个MCP工具：check_file_size / run_eslint / validate_architecture / detect_anti_patterns / check_comment_compliance / full_health_check
- 6种反模式检测器：directApiInView / longTransformInView / bareAsync / resourceLeak / moduleLevelState / duplicateCode
- 架构验证：import/require依赖方向检查 + 直接API调用检测
- 资源泄露检测：setInterval/setTimeout/AbortController/EventSource配对检查
- 测试：3个测试文件（node:test + assert），覆盖核心检测器
- 协议：JSON-RPC 2.0 over stdio（MCP标准）
- npm发布：code-guardian包

## 四方向差异化核心策略

### 1. 前端开发实习生
- **技术能力第1行**：Vue3 / JavaScript / HTML/CSS / Element Plus / Pinia / ECharts
- **项目1（面试宝典）侧重**：9页面组件化 + Composables业务抽离 + ECharts三图联动 + SSE前端流式处理 + 响应式布局
- **项目2（Code Guardian）定位**：前端工程化工具 — 为Vue项目定制架构约束
- **技术亮点第1条**：ant-design-vue PR #8563（开源贡献）
- **项目描述改写要点**：
  - 强调组件拆分粒度、Composables模式设计
  - SSE部分从前端EventSource角度描述
  - ECharts强调数据联动和响应式更新

### 2. Node.js开发实习生
- **技术能力第1行**：Node.js / Express 5 / REST API / JWT / 中间件开发 / JSON-RPC 2.0
- **项目1（面试宝典）侧重**：19个REST API + 4层中间件链 + SSE协议处理 + JSON修复引擎 + 部署运维
- **项目2（Code Guardian）定位**：Node.js工具 + MCP协议设计
- **技术亮点第1条**：中间件链设计（captureRawBody → JSON parser → auth → rateLimit → validateBody）
- **项目描述改写要点**：
  - 强调Express中间件执行顺序和职责分离
  - JSON body容错解析（parse失败时记录rawBody辅助诊断）
  - SSE从协议层描述（text/event-stream、心跳、超时）
  - MCP协议（JSON-RPC 2.0 over stdio）

### 3. 全栈开发实习生
- **技术能力分3行**：前端(Vue3/JS/EP/Pinia) / 后端(Node/Express/JWT/SSE) / 工程(ESLint/Git/阿里云部署)
- **项目1（面试宝典）侧重**：四层架构约束 + 前后端SSE全链路 + 独立部署 + 19个API
- **项目2（Code Guardian）定位**：全栈工程实践 — AI编码约束体系
- **技术亮点第1条**：阿里云独立部署（Nginx反向代理 + PM2进程管理 + SSE proxy_buffering off）
- **项目描述改写要点**：
  - 前后端各占一半bullet
  - 强调四层架构设计（View→Composable→API→Backend）
  - 部署细节（Nginx SSE配置、PM2守护进程）

### 4. 测试开发实习生
- **技术能力第1行**：测试工具开发 / ESLint规则定制 / 单元测试(node:test) / 静态分析 / MCP协议
- **项目1（Code Guardian）提升为主项目**：6个MCP工具 + 6种反模式检测器 + glob匹配引擎 + 3个测试套件
- **项目2（面试宝典）侧重质量保障**：三层容错（JSON修复/速率限制/架构约束）+ 7条AI编码规则
- **技术亮点第1条**：Code Guardian npm包（独立设计并实现代码质量检测工具）
- **项目描述改写要点**：
  - Code Guardian详细描述每个检测器的实现原理
  - 测试覆盖策略（临时目录隔离、fixture模式）
  - 面试宝典从"质量保证体系"角度描述

## 通用约束
- 一页纸，不加emoji，保留头像（assets/photo.jpg）
- 不编造不存在的能力
- 每个方向的项目描述至少改写50%的bullet（不同切入角度）
- 联系方式、教育背景、CET-4等通用信息不变
- 颜色主题：Element Blue (#409eff)
- @media print 适配A4纸

## 实施步骤

1. 创建 resume-xueca/ 目录和 assets/ 子目录
2. 处理头像图片（从用户上传的PDF中提取或提示用户重新提供）
3. 制作 resume-frontend.html
4. 制作 resume-nodejs.html
5. 制作 resume-fullstack.html
6. 制作 resume-testdev.html
7. 用docx npm包生成4份Word版本
8. 验证：检查所有8个文件

## 关键差异化对照表

| 维度 | 前端 | Node.js | 全栈 | 测试开发 |
|------|------|---------|------|---------|
| 技术能力第1行 | Vue3/JS/CSS/EP | Node.js/Express/API/中间件 | 前端/后端/工程三行 | 测试工具/ESLint/单元测试 |
| 项目1切入角度 | 组件化+Composables | 19API+中间件链+JSON修复 | 全栈架构+四层约束 | 质量约束+容错+速率限制 |
| 项目2定位 | 前端工程化工具 | Node.js工具+协议设计 | 全栈工程实践 | 测试工具开发(主项目) |
| 亮点第1条 | ant-design-vue PR | 中间件链设计 | 阿里云部署 | Code Guardian npm |

## 注意事项
- 用户的简历PDF在上次会话中上传但本次会话中不可用，需根据上次会话总结中的信息重建简历内容
- 头像图片需要用户重新提供或从上次会话的文件中恢复
- Word版本使用docx npm包生成，需要处理CJK字体（Microsoft YaHei）

## 验证
- 浏览器打开每个HTML，Ctrl+P预览确认一页纸
- 检查无emoji图标
- 检查头像正常显示（如果有）
- 检查每个方向第一眼看到的内容是否匹配方向
- Word打开.docx确认格式正确、中文不乱码
