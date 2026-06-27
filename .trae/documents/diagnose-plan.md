# 服务器诊断脚本计划

## Summary

用户 Phase 1-4 已完成，但期间与其他 AI 交互导致部分配置被覆盖/回退，目前 `http://8.138.219.100/` 无法访问。

需要一个**全面的诊断脚本**，SSH 到服务器执行一次，输出一份结构化的诊断报告，精确指出每一项的状态（✅/❌）和修复建议。

---

## Current State Analysis

### 可能被 AI 误操作影响的项目

| 配置项 | 可能的问题 | 症状 |
|--------|-----------|------|
| Git 分支/代码 | 分支被切换、代码被回退 | `ecosystem.config.js` 内容不对、缺少某些文件 |
| `.env.production.active` | 文件被删除/覆盖 | JWT_SECRET 为空、后端启动失败 |
| Nginx 配置 | 站点被禁用、default 重新启用 | 80 端口返回 Nginx 默认页 |
| PM2 进程 | 进程被删除/停止 | 5000 端口无响应 |
| 前端构建 | `dist/` 被删除 | 静态文件 404 |
| 后端依赖 | `node_modules` 被清 | `npm ci` 需重新执行 |

### 诊断脚本必须覆盖的范围

```
1. Git 状态        → 分支、最新 commit、本地修改
2. 环境变量        → .env.production.active 存在性、密钥完整性
3. 后端运行时      → PM2 进程、5000 端口、健康响应
4. 前端构建        → dist/index.html 存在性
5. Nginx           → 配置文件、站点启用、80 端口、配置语法
6. 文件权限        → 目录 owner、data 目录可写性
7. 日志摘要        → PM2 日志、Nginx error log 最后 10 行
8. 综合诊断结论    → 哪些通过、哪些失败、修复优先级
```

---

## Proposed Changes

### 改动 1：创建 `scripts/diagnose.sh` — 服务器全面诊断脚本

**What**：一个纯 Bash 脚本，服务器上执行 `bash scripts/diagnose.sh` 后输出结构化的诊断报告。

**Why**：精确定位是哪个环节被破坏，不需要用户手动一个个检查。

**How**：见下方完整实现。

---

## 脚本设计详情

### 输出格式

每个检查项输出格式统一：

```
[1/8] Git 状态
  ✅ 当前分支: reborn
  ✅ 最新 commit: f4ff479
  ❌ 有本地未提交修改: ecosystem.config.js
  → 建议: git stash 后 git pull
```

最后输出综合结论：

```
═══════════════════════════════════════
  诊断结论
═══════════════════════════════════════
  ✅ Git           — 正常
  ❌ 环境变量      — 需要修复
  ✅ 后端          — 正常
  ❌ 前端构建      — 需要修复
  ✅ Nginx         — 正常
  ✅ 文件权限      — 正常
═══════════════════════════════════════
  修复优先级
  1. 编辑 backend/.env.production.active 填入密钥
  2. cd frontend && npm ci && npm run build
═══════════════════════════════════════
```

### 8 项检查实现思路

#### 检查项 1：Git 状态
- `git branch --show-current` → 确认 reborn
- `git log --oneline -1` → 显示最新 commit
- `git status --short` → 显示有修改的文件

#### 检查项 2：环境变量
- 文件存在性：`test -f backend/.env.production.active`
- JWT_SECRET 是否填真实值（不含 `<` 占位符）
- DEEPSEEK_API_KEY 是否填真实值

#### 检查项 3：后端运行时
- `pm2 pid interview-handbook-api` → 进程是否在跑
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/` → 后端是否响应
- `ss -tlnp | grep 5000` → 端口是否监听

#### 检查项 4：前端构建
- `test -f frontend/dist/index.html` → 构建产物是否存在

#### 检查项 5：Nginx
- `test -f /etc/nginx/sites-available/interview-handbook` → 配置是否存在
- `test -L /etc/nginx/sites-enabled/interview-handbook` → 站点是否启用
- `ss -tlnp | grep ':80 '` → 80 端口是否监听
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/` → Nginx 代理是否工作

#### 检查项 6：文件权限
- `stat -c %U backend/data/` → data 目录 owner 是否为 deploy
- `test -w backend/data/` → data 目录是否可写
- Nginx 能否读取 dist：`sudo -u www-data test -r frontend/dist/index.html`

#### 检查项 7：日志摘要
- PM2 日志最后 10 行
- Nginx error log 最后 10 行

#### 检查项 8：综合结论
- 根据以上结果汇总 ✅/❌ 列表
- 输出修复优先级

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 脚本语言 | Bash | 服务器上已有，零依赖；所有检查都涉及系统命令 |
| 是否修复问题 | ❌ 只诊断不修复 | 用户希望先诊断再看问题，修复由用户确认后再执行 |
| 输出格式 | 彩色终端输出（ANSI） | 一目了然，适合 SSH 终端阅读 |
| 是否需要 curl 检查页面 | 是 | 模拟浏览器请求，确认前端可访问 |

---

## Verification Steps

### 本地验证

```bash
bash -n scripts/diagnose.sh
```
预期：无输出（语法正确）

### 服务器验证

```bash
cd /var/www/interview-handbook
git pull origin reborn
bash scripts/diagnose.sh
```
预期：输出完整的 8 项诊断报告
