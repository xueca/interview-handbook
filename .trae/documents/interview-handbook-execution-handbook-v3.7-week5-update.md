# 执行手册 v3.7 Week5 更新补丁

> **更新日期**: 2026-06-23 | **原文版本**: v3.6 (2026-06-16)
> 
> 本文档是对执行手册 v3.6 中 Week5 相关内容的**精确更新**。请将以下内容替换到原手册中对应位置。

---

## 更新 1：文档头部（第 1-8 行）

**替换为**：

```
# 面试宝典（Interview Handbook）— 执行手册 v3.7

> **版本**: v3.7 | **更新**: 2026-06-23（Week5 代码准备全部完成：auth.js 安全加固、PM2/Nginx/部署脚本/备份脚本/生产环境变量模板；创建详细部署计划；修正 Week5 状态标注——代码就绪，待服务器执行）  
> **目标**: 2026年7月15日前具备日常实习面试能力  
> **技术栈**: Vue3 + JS + Vite + Element Plus + Pinia + ECharts | Express + JSON文件存储 | DeepSeek API  
> **部署**: 阿里云轻量服务器 + Nginx + PM2  
> ✅ **当前状态**: Week1–4（Day1-21 + AI 对话增强）**全部完成**；Week5 **代码准备已就绪**（7个文件），**服务器部署待执行**（Day29-35）
```

---

## 更新 2：项目信息卡（第 11-18 行附近）

**在表格末尾新增两行**：

```
| **代码仓库** | https://github.com/xueca/interview-handbook |
| **当前分支** | reborn（部署配置在此分支） |
| **部署计划** | .trae/documents/interview-handbook-week5-detail-plan.md |
```

---

## 更新 3：Week5 整个章节（第 1291-1411 行）

**全文替换为以下内容**：

```
### Week 5：部署上线（6/19-6/25）

**本周目标**：阿里云部署，面试官能通过公网访问

**代码准备进度**：✅ 全部完成（7个文件），详见下方清单  
**服务器执行进度**：⏳ 待执行（Day29-35），详见 [Week5 详细部署计划](./.trae/documents/interview-handbook-week5-detail-plan.md)

---

#### 已完成的代码准备（2026-06-23 同步）

| 文件 | 作用 | 行数 | 状态 |
|------|------|------|------|
| `backend/middleware/auth.js` | 移除 JWT_SECRET 默认 fallback，生产环境未设置时进程退出 | 28 | ✅ 已提交 reborn |
| `backend/.env.production` | 生产环境变量模板（含 JWT_SECRET、DEEPSEEK_API_KEY 占位符） | 6 | ✅ 已创建，Git 排除 |
| `ecosystem.config.js` | PM2 生产进程配置（单实例 fork 模式，适配 SSE 长连接） | 28 | ✅ 已提交 reborn |
| `deploy.sh` | 一键部署脚本：git pull → npm ci → npm run build → pm2 reload | 36 | ✅ 已提交 reborn |
| `backend/scripts/backup-data.sh` | JSON 数据定时备份脚本（tar 打包，保留 30 天） | 18 | ✅ 已提交 reborn |
| `nginx/interview-handbook.conf` | Nginx SSE 生产配置（proxy_buffering off 等关键参数） | 58 | ✅ 已提交 reborn |
| `.gitattributes` | 强制 .sh/.conf 使用 LF 换行符（Linux 兼容） | 3 | ✅ 已提交 reborn |

**验证结果**：
- `auth.js`：JWT_SECRET 未设置时进程退出（exit code 1）✅；JWT_SECRET 设置后模块正常加载 ✅
- `ecosystem.config.js`：Node.js 语法检查通过 ✅
- `deploy.sh` / `backup-data.sh`：LF 换行符确认 ✅

---

#### Day 29（6/19 周四）：买服务器 + 环境安装

**实际状态**：⏳ 待执行

> 📋 详细步骤：见 [Week5 详细部署计划 → 阶段一（购买服务器）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段一购买服务器day29约-1-小时) + [阶段二（服务器初始化）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段二服务器初始化day29约-15-小时)

**摘要**：
1. 阿里云轻量应用服务器（Ubuntu 22.04，2核2G，学生认证约68元/年）
2. 安全组只开放 22/80/443，禁止 5000/5173
3. SSH 登录后安装：Node.js 20 + Nginx + PM2 + UFW + fail2ban
4. 创建 deploy 用户，后续不用 root 操作

---

#### Day 30（6/20 周五）：后端部署

**实际状态**：⏳ 待执行

> 📋 详细步骤：见 [Week5 详细部署计划 → 阶段三（部署后端）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段三部署后端day30约-2-小时)

**摘要**：
1. `git clone` → `git checkout reborn`
2. 创建 `.env.production.active`，填入真实 JWT_SECRET + DEEPSEEK_API_KEY
3. `npm ci --production` → `pm2 start ecosystem.config.js`
4. curl 验证：健康检查、登录 API、SSE 流式接口
5. `pm2 startup systemd` 设置开机自启

---

#### Day 31（6/21 周六）：前端部署 + Nginx

**实际状态**：⏳ 待执行

> 📋 详细步骤：见 [Week5 详细部署计划 → 阶段四（部署前端+Nginx）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段四部署前端--nginxday31约-2-小时) + [阶段五（域名+HTTPS）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段五配置域名--httpsday31-额外约-1-小时)

**摘要**：
1. `npm ci` → `npm run build`（前端构建产物在 `frontend/dist/`）
2. 复制 Nginx 配置，修改 `server_name` 为公网 IP
3. `sudo nginx -t` → `sudo systemctl restart nginx`
4. 浏览器访问 `http://<公网IP>`，确认登录页正常
5. 全流程测试：注册 → 登录 → 题库 → 答题 → AI → Dashboard
6. 如果有域名，配置 Certbot HTTPS

---

#### Day 32（6/22 周日）：线上Bug修复 + Demo视频

**实际状态**：⏳ 待执行

> 📋 详细步骤：见 [Week5 详细部署计划 → 阶段六（Bug修复+Demo）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段六线上-bug-修复--demo-视频day32约-3-小时)

**摘要**：
1. 排查线上 Bug 优先级：SSE 流式 > 跨域 > 认证 > JSON 写入
2. 录 3 分钟 Demo 视频（登录→答题→AI→Dashboard→暗黑模式）
3. 上传 B 站/网盘，链接放 README

---

#### Day 33（6/23 周一）：README + 项目文档

**实际状态**：⏳ 待执行（今日为 6/23）

> 📋 详细步骤：见 [Week5 详细部署计划 → 阶段七（README+文档）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段七readme--项目文档day33约-4-小时)

**摘要**：
1. 写 README.md（自己写，不要 AI）：在线地址、功能截图、技术栈、本地运行、部署步骤
2. 截 4-6 张页面截图放 `docs/screenshots/`
3. 写 `docs/pitfalls.md`（踩坑记录，面试金矿）：
   - 坑1：AI 出题格式不稳定 → Prompt 优化 + 正则容错
   - 坑2：JSON 文件并发写冲突 → 封装读写工具 + 写队列
   - 坑3：生产环境 SSE 流式卡住 → Nginx 关 buffer

---

#### Day 34（6/24 周二）：更新简历

**实际状态**：⏳ 待执行

> 📋 详细步骤：见 [Week5 详细部署计划 → 阶段八（更新简历）](./.trae/documents/interview-handbook-week5-detail-plan.md#阶段八更新简历day34约-3-小时)

**摘要**：
1. 简历新增项目经历：用执行手册 v3.6 Day34 的模板（已写好）
2. 更新 GitHub README + 截图

---

#### Day 35（6/25 周三）：Week5复盘

**实际状态**：⏳ 待执行

**三件事确认**：
- [ ] 线上地址能打开（浏览器访问正常）
- [ ] AI 功能正常（SSE 流式输出逐字返回）
- [ ] Demo 视频能看（上传到 B 站/网盘，链接可访问）

三件事都确认后，Week5 完成，进入 Week6 面试准备。
```

---

## 更新 4：文档末尾（第 1962 行附近）

**替换为**：

```
**最后更新**: 2026-06-23（Week5 代码准备全部完成：auth.js 安全加固、PM2 配置、Nginx SSE 配置、部署脚本、备份脚本、生产环境变量模板、LF 换行符控制；创建详细部署计划 `interview-handbook-week5-detail-plan.md`；修正 Week5 状态标注为"代码就绪，待服务器执行"；下一步：购买服务器，按详细计划执行 Day29-35）
```

---

## 进度对比总结

| 原计划 | 原日期 | 实际状态 | 说明 |
|--------|--------|---------|------|
| Day29 买服务器+环境 | 6/19 | ⏳ 待执行 | 已延期4天，今天是6/23 |
| Day30 后端部署 | 6/20 | ⏳ 待执行 | 代码已准备就绪 |
| Day31 前端+Nginx | 6/21 | ⏳ 待执行 | Nginx 配置已就绪 |
| Day32 Bug修复+Demo | 6/22 | ⏳ 待执行 | 待部署后执行 |
| Day33 README+文档 | 6/23 | ⏳ 待执行 | 今日开始 |
| Day34 更新简历 | 6/24 | ⏳ 待执行 | |
| Day35 Week5复盘 | 6/25 | ⏳ 待执行 | |

**关键阻塞项**：尚未购买云服务器。这是所有后续步骤的前提。

**建议**：今天（6/23）优先完成 Day29（买服务器+环境初始化），明天（6/24）Day30-31（前后端部署），这样 Day33-35 的文档/简历/复盘可以在 6/25 前完成，与原计划仅差 1-2 天。