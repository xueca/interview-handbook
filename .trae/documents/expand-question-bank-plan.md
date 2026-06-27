# 题库扩展计划 — Vue / CSS / HTML 题目补充

---

## Summary

当前题库 66 题（JavaScript:20 / CSS:15 / Vue:11 / 网络:7 / 工程化:6 / HTML:4 / 浏览器:3），数量偏少，尤其是 Vue（11）、CSS（15）、HTML（4）覆盖面不足。本计划分两步走：① git commit 保存当前进度 → ② 一次性将题库扩展至 150+ 题，重点补充 Vue、CSS、HTML 三大方向。

---

## Current State Analysis

### 题库现状

| 分类 | 题数 | 覆盖评价 | 扩展目标 |
|------|------|---------|---------|
| JavaScript | 20 | 覆盖面较好，少量补充 | 25 |
| **Vue** | **11** | **严重不足，缺少重点主题** | **35** |
| **CSS** | **15** | **中等，布局/动画/预处理器空缺** | **30** |
| 网络 | 7 | 够用 | 10 |
| 工程化 | 6 | 够用 | 10 |
| **HTML** | **4** | **严重不足** | **20** |
| 浏览器 | 3 | 够用 | 10 |
| **总计** | **66** | **偏少** | **140+** |

### Vue 已有题目缺什么

当前 11 题覆盖了：v-if/v-show、computed/watch、组件通信（props/emit）、生命周期、响应式原理、keep-alive、nextTick

**缺失的关键主题**：
- Vue 3 Composition API（setup、ref/reactive）
- Vue 3 新特性（Teleport、Suspense、Fragment）
- Slot（作用域插槽、具名插槽）
- Vue Router（导航守卫、动态路由、懒加载）
- Pinia vs Vuex（状态管理对比）
- 自定义指令
- Mixin vs Composition API
- 虚拟 DOM 与 diff 算法
- 响应式原理深入（Proxy vs Object.defineProperty）
- ref 和 reactive 的区别
- provide/inject
- 生命周期 Hooks（Composition API 版）
- 组件 style scoped 原理
- Vue 性能优化

### CSS 已有题目缺什么

当前 15 题覆盖了：盒模型、选择器优先级、flex、grid、BFC、position、伪类/伪元素、display none/visibility、margin/padding、background-color

**缺失的关键主题**：
- Flexbox 深入（align-items、justify-content、flex-grow/shrink）
- CSS Grid 布局
- CSS 动画（transition、animation、@keyframes）
- 预处理器（Sass/Less 变量、mixin、嵌套）
- CSS 变量（custom properties）
- 响应式设计（media queries、rem/em/vw/vh）
- 层叠上下文
- transform 与 translate
- 渐变（linear-gradient、radial-gradient）
- CSS 函数（calc、clamp、min/max）
- 滤镜（filter）
- 滚动行为与滚动捕捉
- 字体图标（iconfont、font-awesome）
- 移动端适配（1px 问题、viewport）

### HTML 已有题目缺什么

当前 4 题覆盖了：语义化标签、input type 新增、article 标签、srcset 响应式图片

**缺失的关键主题**：
- DOCTYPE 与标准模式/怪异模式
- meta 标签（viewport、charset、keywords）
- HTML5 新 API（localStorage、sessionStorage、canvas、video/audio）
- 表单属性与验证（required、pattern、autocomplete）
- 可访问性（ARIA 属性、alt text、tabindex）
- SVG（基础标签、viewBox）
- iframe（优缺点、sandbox）
- 图片懒加载（loading="lazy"）
- 脚本加载（async、defer）
- Data URI 与 base64
- Web Worker
- Canvas 基础
- drag & drop API
- contenteditable

---

## Proposed Changes

### Step 1: Git Commit 保存当前进度

**What**：将当前所有修改提交并推送到 GitHub（reborn 分支）。

**Why**：扩展题库涉及大量 JSON 数据改写，万一脚本出错导致 questions.json 损坏，有版本可回滚。

**How**：`git add -A` → `git commit -m "save: checkpoint before question bank expansion"` → `git push origin reborn`

---

### Step 2: 创建题库生成脚本

**What**：在 `backend/scripts/generate-questions.js` 中编写题目数据 JSON，生成新的 `questions.json`。

**Why**：
- 手动编辑 80+ 题非常容易出错（JSON 格式、逗号、ID 冲突）
- 脚本可以自动分配 ID、校验格式、统计分类
- 支持预览模式（先打印预览，确认后再写入）

**How**：

```js
// 文件功能: 题库生成脚本 | 数据流: 运行脚本 → 合并新旧题目 → 写入 questions.json
// 用法: node backend/scripts/generate-questions.js [--preview]
//
// --preview: 仅打印预览，不写入文件

const fs = require('fs');
const path = require('path');

// 读取现有题库
const questions = require('../data/questions.json');

// 新的题目数据（Vue / CSS / HTML 为主）
const newQuestions = [
  // ... 80+ 新题目按分类排列
];

// 自动分配 ID
const maxId = Math.max(...questions.map(q => q.id), 0);
newQuestions.forEach((q, i) => { q.id = maxId + 1 + i; });

// 合并
const merged = [...questions, ...newQuestions];

// 预览或写入
if (process.argv.includes('--preview')) {
  console.log('Total:', merged.length);
  // 按分类统计
  // 列出新增题目标题
} else {
  fs.writeFileSync(
    path.join(__dirname, '../data/questions.json'),
    JSON.stringify(merged, null, 2),
    'utf-8'
  );
  console.log('写入完成，共', merged.length, '题');
}
```

### Step 3: 新题目内容 — Vue（+24 题，目标 35）

每个题目包含：title、options（4 选项）、answer（索引）、analysis、category: "Vue"、difficulty、type: "single"

| # | 主题 | difficulty | 说明 |
|---|------|-----------|------|
| 1 | Vue 3 ref 与 reactive 区别 | easy | 响应式数据 API 异同 |
| 2 | computed 与 watch 区别 | medium | 计算属性 vs 侦听器 |
| 3 | Composition API setup 函数 | medium | setup 执行时机、参数 |
| 4 | Vue 3 为什么用 Proxy 替代 defineProperty | hard | 性能优势、拦截能力 |
| 5 | 具名插槽与作用域插槽 | medium | slot 传递数据 |
| 6 | Vue Router 导航守卫 | medium | beforeEach、beforeResolve |
| 7 | 动态路由与路由懒加载 | medium | import()、路由匹配 |
| 8 | Pinia vs Vuex | medium | 对比（TS 支持、Module） |
| 9 | 自定义指令 | easy | directive 生命周期 |
| 10 | mixin 缺点与 Composition API 优势 | medium | 命名冲突、来源不明确 |
| 11 | Vue 虚拟 DOM diff 算法 | hard | 同层比较、key 作用 |
| 12 | provide/inject | medium | 跨层级传值 |
| 13 | 生命周期 hooks（Composition API） | easy | onMounted、onUnmounted |
| 14 | scoped 样式原理 | medium | data-v-xxx 属性选择器 |
| 15 | Teleport 组件 | easy | 传送门、modal 应用 |
| 16 | keep-alive 深入 | medium | include/exclude、生命周期 |
| 17 | v-for key 为什么必须唯一 | easy | diff 优化、复用 |
| 18 | Vue 模板编译过程 | hard | parse → optimize → generate |
| 19 | nextTick 原理 | medium | 微任务 + 异步更新队列 |
| 20 | event bus 的问题与替代方案 | medium | provide/inject、Pinia |
| 21 | Vue 3 Fragment | easy | 多根节点模板 |
| 22 | Suspense 组件 | medium | 异步依赖处理 |
| 23 | reactive 丢失响应式的情况 | medium | 解构、直接替换 |
| 24 | 函数式组件 | medium | functional、无状态组件 |

### Step 4: 新题目内容 — CSS（+15 题，目标 30）

| # | 主题 | difficulty | 说明 |
|---|------|-----------|------|
| 1 | Flex: align-items vs align-content | medium | 交叉轴对齐差异 |
| 2 | Flex: flex-grow / flex-shrink / flex-basis | medium | flex 弹性因子计算 |
| 3 | Grid: grid-template-columns 与 area | medium | Grid 布局基础 |
| 4 | CSS 动画: transition vs animation 区别 | medium | 触发方式、关键帧 |
| 5 | @keyframes 关键帧动画 | medium | from/to、百分比 |
| 6 | Sass 变量与 CSS 变量区别 | medium | 编译时 vs 运行时 |
| 7 | CSS 层叠上下文 | hard | z-index、opacity、transform |
| 8 | 响应式设计: rem/em/vw/vh 区别 | medium | 相对单位计算基准 |
| 9 | CSS 函数 calc / clamp | easy | 动态计算 |
| 10 | 滤镜 filter | easy | blur、brightness |
| 11 | 移动端 1px 问题 | hard | 物理像素、devicePixelRatio |
| 12 | 滚动捕捉 scroll-snap | medium | 滚动对齐 |
| 13 | 字体图标原理 | easy | iconfont、字体文件 |
| 14 | 渐变 linear-gradient | medium | 方向、多色渐变 |
| 15 | object-fit / object-position | medium | 图片/视频裁切 |

### Step 5: 新题目内容 — HTML（+16 题，目标 20）

| # | 主题 | difficulty | 说明 |
|---|------|-----------|------|
| 1 | DOCTYPE 作用与怪异模式 | medium | 渲染模式差异 |
| 2 | meta viewport | easy | 移动端适配必知 |
| 3 | localStorage vs sessionStorage | easy | 存储范围、生命周期 |
| 4 | canvas 基础 | medium | 画布、getContext、绘制 |
| 5 | video / audio 标签 | easy | 支持的格式、属性 |
| 6 | ARIA 可访问性 | medium | role、aria-label |
| 7 | iframe sandbox 属性 | medium | 安全限制 |
| 8 | async vs defer | medium | 脚本加载执行顺序 |
| 9 | 图片懒加载 native loading | easy | loading="lazy" |
| 10 | Web Worker | medium | 多线程、限制 |
| 11 | SVG vs Canvas | medium | 矢量 vs 位图 |
| 12 | drag & drop API | medium | draggable、事件 |
| 13 | contenteditable | easy | 网页编辑 |
| 14 | data-* 自定义属性 | easy | dataset API |
| 15 | base64 与 Data URI | medium | 优缺点、适用场景 |
| 16 | HTML5 History API | hard | pushState、replaceState |

### Step 6: 补充其他分类（+10 题）

- **JavaScript** +5：Symbol、WeakMap、Generator、Decorator、BigInt
- **网络** +3：HTTP/2 多路复用、WebSocket、CDN
- **工程化** +4：ESLint 原理、Monorepo、Module Federation、CI/CD 流程
- **浏览器** +7：渲染流水线深入、内存泄漏检测、Web 安全（XSS/CSRF）、Cookie/Session、跨域解决方案、性能优化（Lighthouse、Core Web Vitals）、PWA

### Step 7: 写入并验证

1. 运行生成脚本（preview 模式预览总题数 + 分类统计）
2. 确认无误后写入文件
3. 运行后端启动，测试题库接口返回新数据
4. git commit + push

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 用脚本生成，非手动编辑 | 脚本生成 | 80+ 题手动编辑极易出错，脚本可自动分配 ID、校验格式 |
| 追加方式（保留原题） | 保留 | 原题已部署在线上，直接改后重启前端后端无需改代码 |
| 不涉及前端代码改动 | 纯数据 | 题库浏览页面已支持分页+筛选+搜索，加数据即生效 |
| 题目 ID 从 67 开始 | 追加 | 原题 1-66 已有用户答题记录关联，保留原有 ID |
| 配套更新测验功能 | 否 | 后续 Week6 再做，本次只加数据 |

---

## Verification Steps

1. **git commit 后**：`git log --oneline -1` 确认最新 commit
2. **生成脚本 preview 模式**：打印 "Total: XXX" + 分类统计，确认每分类在目标区间
3. **写入后**：用 `node -e "require('./backend/data/questions.json').length"` 验证总题数
4. **后端启动**：`node backend/app.js`，curl `http://localhost:5000/api/questions` 确认返回新数据
5. **前端验证**：浏览器打开，题库页显示新题目，筛选正常

---

## 回滚方案

如果写入后发现数据异常：
```bash
git checkout -- backend/data/questions.json
pm2 restart interview-handbook-api
```

JSON 损坏不会影响其他文件，回滚只需一句话。