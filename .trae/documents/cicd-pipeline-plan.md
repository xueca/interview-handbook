# CI/CD 流水线实施计划

> 为已上线的 interview-handbook 项目补充 GitHub Actions CI/CD 流水线。
> 分支：`reborn`（非 main）。项目已上线运行于 `http://8.138.219.100`。

---

## Summary

为 Vue3 + Express 全栈项目新增 GitHub Actions CI/CD 流水线。CI 部分在 push 到 `reborn` 分支时自动执行前端 ESLint 检查 + Vite 构建 + 后端文件行数检查；CD 部分在 CI 通过后通过 SSH 连接服务器执行已有的 `deploy.sh` 完成自动部署。实施涉及 2 个新增文件（`.github/workflows/ci.yml`、`.github/workflows/deploy.yml`）和 1 个修改文件（`frontend/package.json` 补全 ESLint 依赖 + lint 脚本），不触碰任何源代码和现有部署脚本。

---

提问：这里面的eslint是对的吗   D:\BaiduNetdiskDownload\A055\sql\trae\shuju\webtest\interview-handbook\frontend
![78368297028](D:\Pic\Camera Roll\1783682970280.png)

## Current State Analysis

### 现有基础设施

| 文件 | 作用 | 状态 |
|------|------|------|
| `deploy.sh` | 一键部署：`git stash` → `git pull origin reborn` → backend `npm ci --production` → frontend `npm ci` + `npm run build` → `pm2 reload` | 已使用 `reborn` 分支，无需修改 |
| `ecosystem.config.js` | PM2 配置：fork 单实例（SSE 有状态），端口 5000 | 无需修改 |
| `nginx/interview-handbook.conf` | Nginx 配置：静态资源 + API 反代 + SSE 透传 | 无需修改 |
| `.husky/pre-commit` | 运行 `cd frontend && npx lint-staged` | **当前无效**：缺依赖和配置 |
| `.gitattributes` | 强制 `.sh`/`.conf` 用 LF 换行 | 已保障 CI/Linux 兼容 |
| `frontend/eslint.config.js` | ESLint 9 flat config，含自定义架构插件 | 无需修改 |
| `frontend/eslint-plugin-architecture/index.js` | 自定义规则 `no-direct-fetch-in-views`（ESM 语法） | 无需修改 |
| `backend/scripts/check-file-size.js` | 后端文件行数检查：controllers<=150, routes<=50, middleware<=80 | 仅用 Node 内置模块，无需 npm install |

### 核心问题（CI/CD 实施前必须解决）

**问题1：ESLint 依赖缺失**

`frontend/package.json` 的 devDependencies 仅有 `@vitejs/plugin-vue` 和 `vite`。但 `eslint.config.js` 导入了 4 个外部模块（`@eslint/js`、`eslint-plugin-vue`、`globals`、本地架构插件）。这些包既不在 `package.json` 也不在 `package-lock.json` 中。CI 的 `npm ci` 不会安装它们，ESLint 检查必然失败。

需补全的包（6 个）：

| 包名 | 建议版本 | 用途 |
|------|---------|------|
| `eslint` | `^9.0.0` | ESLint 核心引擎（9.x 支持 flat config） |
| `@eslint/js` | `^9.0.0` | 官方推荐规则集 |
| `eslint-plugin-vue` | `^10.0.0` | Vue 官方 ESLint 插件 |
| `vue-eslint-parser` | `^10.0.0` | Vue SFC 解析器（eslint-plugin-vue 10.x 的 peer dependency，必须显式安装） |
| `globals` | `^15.0.0` | 全局变量定义 |
| `lint-staged` | `^15.0.0` | Git 暂存文件 lint 工具（本地已装 15.5.2） |

**问题2：无 lint-staged 配置**

`.husky/pre-commit` 调用 `npx lint-staged`，但 `package.json` 中无 `lint-staged` 配置字段，也无 `.lintstagedrc` 文件。pre-commit 钩子当前形同虚设。

**问题3：无 lint 脚本**

`frontend/package.json` 的 scripts 仅有 `dev`、`build`、`preview`，缺少 `lint`。

**问题4：ESLint 可能存在未发现的违规**

由于 ESLint 从未在 CI 环境中运行过，现有代码可能存在 error 级别违规。推送 CI/CD 配置前必须先在本地运行 lint 并修复所有 error。

### 服务器环境

- IP：`8.138.219.100`（来源：README.md）
- 项目路径：`/var/www/interview-handbook`
- Node.js 20 LTS + PM2 + Nginx
- 访问地址：`http://8.138.219.100`

---

## Proposed Changes

### 变更1：修改 `frontend/package.json`（补全依赖 + 脚本 + lint-staged 配置）

**What**：在 devDependencies 中新增 6 个包，scripts 中新增 `lint`，新增 `lint-staged` 配置字段。

**Why**：CI 的 `npm ci` 严格按 `package.json` + `package-lock.json` 安装依赖。当前 ESLint 相关包未声明，CI 中 ESLint 无法运行。同时修复 pre-commit 钩子无效的问题。

**How**：仅新增内容，不改动现有 `dependencies`、`scripts.dev/build/preview`。

修改后的 `frontend/package.json`：

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.2",
    "axios": "^1.17.0",
    "echarts": "^6.1.0",
    "element-plus": "^2.14.1",
    "pinia": "^3.0.4",
    "vue": "^3.5.12",
    "vue-router": "^4.6.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@vitejs/plugin-vue": "^5.1.4",
    "eslint": "^9.0.0",
    "eslint-plugin-vue": "^10.0.0",
    "globals": "^15.0.0",
    "lint-staged": "^15.0.0",
    "vite": "^5.4.10",
    "vue-eslint-parser": "^10.0.0"
  },
  "lint-staged": {
    "*.{js,vue}": ["eslint --fix"]
  }
}
```

**配套操作**：修改后在 `frontend/` 目录执行 `npm install`，自动更新 `package-lock.json`。两个文件必须一起提交。

### 变更2：新增 `.github/workflows/ci.yml`（可复用 CI 工作流）

**What**：创建可复用 CI 工作流，执行前端 ESLint + Vite 构建 + 后端文件行数检查。

**Why**：提供代码质量门禁，在部署前验证代码不会破坏构建。

**How**：使用 `workflow_call` 触发器，被 `deploy.yml` 调用。不在 push 时独立触发，避免重复执行。

```yaml
# 文件功能: 可复用 CI 工作流 | 触发方式: 被 deploy.yml 通过 workflow_call 调用
# 检查内容: 前端 ESLint + Vite 构建 + 后端文件行数检查
name: CI

on:
  workflow_call:
    secrets: inherit

permissions:
  contents: read

jobs:
  lint-and-build:
    name: Lint & Build
    runs-on: ubuntu-latest

    steps:
      # 1. 检出代码
      - name: Checkout
        uses: actions/checkout@v4

      # 2. 安装 Node.js 20 并启用 npm 缓存
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'

      # 3. 安装前端依赖（npm ci 严格按 lock 文件安装）
      - name: Install frontend dependencies
        run: npm ci
        working-directory: frontend

      # 4. ESLint 代码检查（架构规则 + 文件行数 + 反模式）
      - name: Run ESLint
        run: npm run lint
        working-directory: frontend

      # 5. Vite 生产构建（验证代码可正常打包）
      - name: Build frontend
        run: npm run build
        working-directory: frontend

      # 6. 后端文件行数检查（仅用 Node 内置模块，无需 npm install）
      - name: Check backend file sizes
        run: node scripts/check-file-size.js
        working-directory: backend
```

### 变更3：新增 `.github/workflows/deploy.yml`（CD 部署工作流）

**What**：创建 CD 工作流，push 到 `reborn` 分支时触发，先调用 CI 工作流，通过后 SSH 到服务器执行 `deploy.sh`。

**Why**：实现 push → 自动检查 → 自动部署的完整流水线。复用已有 `deploy.sh`，不重新实现部署逻辑。

**How**：使用可复用工作流模式（`uses: ./.github/workflows/ci.yml`），兼容 `reborn` 分支。用 `appleboy/ssh-action@v1` 执行 SSH 部署。添加 `concurrency` 控制防止并发部署冲突。

```yaml
# 文件功能: CD 部署工作流 | 触发方式: push 到 reborn 分支
# 流程: 调用 ci.yml（lint+构建）→ CI 通过后 SSH 到服务器执行 deploy.sh
name: Deploy

on:
  push:
    branches:
      - reborn

permissions:
  contents: read

# 并发控制：同一分支只允许一个部署运行，新 push 取消旧部署
concurrency:
  group: deploy-reborn
  cancel-in-progress: true

jobs:
  # Job 1: 调用可复用 CI 工作流
  ci:
    name: CI Check
    uses: ./.github/workflows/ci.yml

  # Job 2: SSH 部署（依赖 CI 通过）
  deploy:
    name: Deploy to Server
    needs: ci
    runs-on: ubuntu-latest

    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          command_timeout: 10m
          script: |
            set -e
            cd /var/www/interview-handbook
            bash deploy.sh
```

**架构选型理由**：使用可复用工作流（`workflow_call`）而非 `workflow_run` 触发器，因为 `workflow_run` 始终使用仓库默认分支（`main`）的工作流文件，不兼容 `reborn` 分支。可复用工作流在调用方所在分支执行，完美兼容 `reborn`。

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| CI/CD 平台 | GitHub Actions | 仓库已托管在 GitHub，零额外基础设施 |
| 工作流架构 | 可复用工作流（ci.yml + deploy.yml） | 兼容 reborn 分支；CI 可独立复用于未来 PR 场景 |
| CI 检查范围 | 前端 ESLint + Vite 构建 + 后端文件行数 | 项目无测试套件，CI 只能做 lint + 构建验证 |
| CD 部署方式 | SSH 执行已有 deploy.sh | 复用现有部署逻辑，不重新实现 |
| SSH Action | appleboy/ssh-action@v1 | 最成熟的 SSH 部署 Action（MIT 协议，社区广泛使用） |
| 并发控制 | concurrency group + cancel-in-progress | 防止快速连续 push 导致 git pull 冲突 |
| Node 版本 | 20 LTS | 与服务器一致（deploy-plan 已确认） |
| ESLint 版本 | 9.x（flat config） | 项目已使用 eslint.config.js flat config 格式 |
| lint-staged 配置位置 | package.json 内嵌 | 无需额外配置文件，pre-commit 钩子 `cd frontend` 后可直接读取 |

### GitHub Secrets 需配置项

在 GitHub 仓库 Settings → Secrets and variables → Actions → New repository secret：

| Secret 名称 | 值 | 说明 |
|-------------|---|------|
| `SSH_HOST` | `8.138.219.100` | 服务器公网 IP |
| `SSH_USERNAME` | 部署用户名（如 `root`） | SSH 登录用户 |
| `SSH_PRIVATE_KEY` | SSH 私钥全文 | 含 `-----BEGIN/END ... PRIVATE KEY-----` 的完整内容 |
| `SSH_PORT` | `22`（或自定义端口） | SSH 端口 |

SSH 密钥生成（在本地执行）：

```bash
# 生成专用部署密钥（ED25519）
ssh-keygen -t ed25519 -a 200 -C "github-actions-deploy@interview-handbook"
# 不设 passphrase（CI 无法交互输入）

# 公钥添加到服务器
cat ~/.ssh/id_ed25519.pub | ssh root@8.138.219.100 'cat >> ~/.ssh/authorized_keys'

# 私钥全文粘贴到 GitHub Secret SSH_PRIVATE_KEY
cat ~/.ssh/id_ed25519
```

---

## 风险评估（对已上线项目的影响）

### 变更影响分析

| 变更项 | 风险等级 | 影响范围 | 分析 |
|--------|---------|---------|------|
| `frontend/package.json` 新增 devDependencies | **无风险** | 仅开发环境 | devDependencies 在服务器 `npm ci` 时安装，但 `npm run build` 后只输出 `dist/` 静态文件，运行时不依赖 node_modules |
| `frontend/package.json` 新增 `lint` 脚本 | **无风险** | 仅新增命令 | 不修改现有 `dev`/`build`/`preview`，不影响构建流程 |
| `frontend/package.json` 新增 `lint-staged` 配置 | **无风险** | 仅 pre-commit 钩子 | 只影响本地 git commit 行为，不影响运行时 |
| `package-lock.json` 更新 | **低风险** | 服务器 npm ci | 服务器 `deploy.sh` 的 `npm ci` 会安装新增 devDependencies，增加约 50-80MB 磁盘占用，不影响运行时 |
| `ci.yml` 新增 | **无风险** | GitHub Actions 运行器 | 仅在 GitHub 云端执行，不触及服务器 |
| `deploy.yml` 新增 | **中风险** | 服务器 | 每次 push 到 reborn 自动触发部署，等同于手动执行 deploy.sh |

### 预先存在的风险（非 CI/CD 引入，但需知晓）

**风险1：deploy.sh 的 `git stash` 可能丢失数据**

deploy.sh 第 12 行 `git stash` 会暂存服务器本地修改，但无对应 `git stash pop`。如果 `backend/data/*.json`（records.json, users.json 等运行时数据）被 git 跟踪且在运行时被修改，`git pull` 会用远程版本覆盖，导致用户数据丢失。

此风险在手动部署时同样存在，CI/CD 只是自动化了已有流程。建议后续单独修复（将运行时 JSON 文件加入 `.gitignore` 并 `git rm --cached`）。

**风险2：ESLint 检查可能因历史代码违规而失败**

ESLint 从未在 CI 环境运行过，现有代码可能存在 error 级别违规。如果 CI 的 `npm run lint` 报错，会阻止部署。

**缓解措施**：推送 CI/CD 配置前，先在本地运行 `cd frontend && npm install && npm run lint`，修复所有 error。如果违规数量较多，可临时在 ci.yml 的 lint step 加 `continue-on-error: true`，待逐步修复后启用严格模式。

---

## Verification Steps

### 阶段1：本地验证（推送前）

```bash
# 1. 验证 ESLint 依赖安装
cd frontend
npm install
npx eslint --version         # 应输出版本号

# 2. 验证 lint 脚本可运行（修复所有 error）
npm run lint

# 3. 验证构建不受影响
npm run build                # 应正常输出 dist/

# 4. 验证后端文件行数检查
cd ../backend
node scripts/check-file-size.js   # 应全部 OK

# 5. 验证 pre-commit 钩子生效
cd ../frontend
git add -A
git commit -m "test: verify lint-staged"  # 应触发 ESLint 检查
```

### 阶段2：CI 验证（推送后）

1. 推送到 `reborn` 分支：`git push origin reborn`
2. 在 GitHub 仓库 Actions 页面查看：
   - "CI Check" job 应为绿色（lint + build + file-size 全部通过）
   - "Deploy to Server" job 应在 CI 通过后开始执行
   - SSH 部署日志应显示 deploy.sh 的输出

### 阶段3：服务器验证（部署后）

```bash
ssh root@8.138.219.100

# 检查代码已更新
cd /var/www/interview-handbook
git log --oneline -1         # 应显示最新 commit

# 检查 PM2 进程状态
pm2 status                   # interview-handbook-api 应为 online
pm2 logs interview-handbook-api --lines 5 --nostream  # 无错误

# 检查后端健康
curl -s http://127.0.0.1:5000/    # 应返回 "Hello World!"

# 检查前端页面
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/  # 应返回 200
```

### 回滚方案（如果部署失败）

```bash
ssh root@8.138.219.100
cd /var/www/interview-handbook

git reset --hard HEAD~1
cd backend && npm ci --production && cd ..
cd frontend && npm ci && npm run build && cd ..
pm2 reload ecosystem.config.js --env production
curl -s http://127.0.0.1:5000/
```

---

## 实施顺序

1. 修改 `frontend/package.json`（补全 devDependencies + lint script + lint-staged 配置）
2. 执行 `cd frontend && npm install`（安装依赖，更新 package-lock.json）
3. 执行 `cd frontend && npm run lint`（修复所有 ESLint error）
4. 执行 `cd backend && node scripts/check-file-size.js`（确认后端检查通过）
5. 创建 `.github/workflows/ci.yml`
6. 创建 `.github/workflows/deploy.yml`
7. 在 GitHub 仓库配置 4 个 Secrets（SSH_HOST, SSH_USERNAME, SSH_PRIVATE_KEY, SSH_PORT）
8. 提交并推送到 `reborn` 分支
9. 在 GitHub Actions 页面监控 CI Check 和 Deploy 两个 job
10. SSH 到服务器确认部署成功
