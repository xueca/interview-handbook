# 答题系统Bug修复与错题本增强计划

> 版本: v1.0 | 项目: 面试宝典（Interview Handbook）
> 关联: 执行手册v3.0 Week2、.trae/rules/、.trae/skills/generate-with-constraints

---

## Summary

本计划针对面试宝典项目的4项需求进行系统性修复与增强：

1. **题目类型区分**：为 `questions.json` 添加 `type` 字段（single/multiple/judge），修复 `useQuiz.js` 的 `handleSelect` 单选逻辑
2. **未答题不判错**：修复 `stats.js` 的 `calcScore`，未答题不加入错题本
3. **错题本增强**：为 `WrongBook.vue` 添加筛选（分类/难度/关键词）+ 批量重答 + 三次答对自动移除
4. **重点关注标记**：为 `recordController.js` 添加 `isMarked` 字段 + API，`WrongBook.vue` 添加标记UI

所有变更严格遵守项目分层契约、文件行数限制（.vue ≤ 200行, .js ≤ 150行, 函数 ≤ 30行）及反模式清单。

---

## Current State Analysis

### 架构现状

```
views/*.vue → composables/use*.js → api/*.js → backend/routes/*.js → controllers/*.js → data/index.js
```

### 关键文件现状

| 文件 | 当前行数 | 问题 |
|------|---------|------|
| `backend/data/questions.json` | 453行 | 无 `type` 字段，所有题目默认为单选 |
| `frontend/src/composables/useQuiz.js` | 108行 | `handleSelect` 只有多选逻辑（toggle），无单选/判断题区分 |
| `frontend/src/utils/stats.js` | 28行 | `calcScore` 中未答题（`ans`为空）被判定为 `isCorrect: false`，会进入错题本 |
| `frontend/src/views/WrongBook.vue` | 95行 | 无筛选功能、无批量操作、无三次答对移除机制 |
| `backend/controllers/recordController.js` | 77行 | 无 `isMarked` 字段，无标记相关API |
| `backend/routes/records.js` | 12行 | 无标记相关路由 |
| `frontend/src/api/records.js` | 17行 | 无标记相关API函数 |

### 数据流分析

- 答题记录通过 `submitRecord` → `POST /api/records` 保存，包含 `details` 数组
- 错题通过 `getWrong` → `GET /api/records/wrong` 获取，遍历所有记录的 `details` 中 `isCorrect: false` 的题目
- 错题本目前仅展示题目基本信息，无用户交互状态（如标记）

---

## Proposed Changes

### 变更清单总览

| # | 需求 | 涉及文件 | 变更类型 |
|---|------|---------|---------|
| 1 | 题目类型区分 | `questions.json`, `useQuiz.js` | 数据+逻辑修复 |
| 2 | 未答题不判错 | `stats.js`, `recordController.js` | 逻辑修复 |
| 3 | 错题本增强 | `WrongBook.vue`, `useWrongBook.js`(新), `records.js`(api), `recordController.js`, `records.js`(routes) | 功能增强 |
| 4 | 重点关注标记 | `recordController.js`, `records.js`(routes), `records.js`(api), `WrongBook.vue` | 功能增强 |

---

### 详细变更

#### 1. 题目类型区分

**文件**: `backend/data/questions.json`

- **What**: 为每道题目添加 `type` 字段，值为 `"single"`（单选）、`"multiple"`（多选）、`"judge"`（判断题）
- **Why**: 当前所有题目无类型区分，`useQuiz.js` 的 `handleSelect` 只能做多选toggle，单选题选中A后再选B会同时选中两个
- **How**: 
  - 遍历50道题，根据选项数量和题意判断类型
  - 选项为2个且是"正确/错误"或"是/否"类 → `judge`
  - 选项为2-4个且只有1个正确答案 → `single`
  - 选项为多个且允许多选 → `multiple`（当前题库暂无，预留）

**文件**: `frontend/src/composables/useQuiz.js`

- **What**: 修改 `handleSelect` 函数，根据题目 `type` 执行不同选择逻辑
- **Why**: 当前 `handleSelect` 只有 toggle 逻辑，单选题应该"替换"而非"追加"
- **How**:
  ```javascript
  function handleSelect(index) {
    if (submitted.value) return
    const qid = currentQuestion.value?.id
    if (!qid) return
    const type = currentQuestion.value?.type || 'single'
    const cur = userAnswers.value[qid] || []
    
    if (type === 'multiple') {
      // 现有toggle逻辑
      if (cur.includes(index)) {
        userAnswers.value[qid] = cur.filter(i => i !== index)
      } else {
        userAnswers.value[qid] = [...cur, index]
      }
    } else {
      // single / judge: 直接替换
      userAnswers.value[qid] = [index]
    }
  }
  ```

---

#### 2. 未答题不判错

**文件**: `frontend/src/utils/stats.js`

- **What**: 修改 `calcScore` 中 `isCorrect` 的判断逻辑，未答题不标记为错误
- **Why**: 当前代码 `const isCorrect = ans?.length ? ans[0] === q.answer : false`，未答题时 `isCorrect = false`，会被 `getWrong` 收集进错题本
- **How**:
  ```javascript
  // 修改前
  const isCorrect = ans?.length ? ans[0] === q.answer : false
  
  // 修改后
  const hasAnswer = ans?.length > 0
  const isCorrect = hasAnswer ? checkAnswer(ans, q.answer, q.type) : null
  ```
  - `isCorrect` 为 `null` 表示未答题，不加入错题
  - `checkAnswer` 函数处理不同类型题目的答案比对（单选/多选/判断）

**文件**: `backend/controllers/recordController.js` — `getWrong` 函数

- **What**: 修改错题收集逻辑，跳过 `isCorrect === null`（未答题）和 `isCorrect === true`（答对）的条目
- **Why**: 与前端 `calcScore` 保持一致
- **How**:
  ```javascript
  // 修改前
  if (!d.isCorrect) wrongIds.add(d.questionId)
  
  // 修改后
  if (d.isCorrect === false) wrongIds.add(d.questionId)
  ```

---

#### 3. 错题本增强

**新建文件**: `frontend/src/composables/useWrongBook.js`

- **What**: 抽离错题本的业务逻辑（筛选、分页、批量操作、加载）
- **Why**: `WrongBook.vue` 当前95行，增加筛选+批量操作后必然超过200行限制，必须抽composable
- **How**:
  - `loadWrong()`: 调用 `getWrong()` 获取错题列表
  - `filter`: 响应式筛选条件（category, difficulty, keyword）
  - `filteredList`: computed 筛选后的列表
  - `selectedIds`: 批量选中的题目ID
  - `batchRetry()`: 批量重答，拼接ID跳转 `/quiz?ids=...`
  - `toggleSelect(id)`: 切换选中状态

**文件**: `frontend/src/views/WrongBook.vue`

- **What**: 添加筛选栏（分类/难度/关键词）、批量选择checkbox、批量重答按钮、分页
- **Why**: 提升错题本可用性
- **How**:
  - 引入 `useWrongBook` composable
  - 顶部添加筛选区（参考 `QuestionBank.vue` 风格）
  - 每道错题前加 `el-checkbox` 用于批量选择
  - 添加"批量重答"按钮，选中题目跳转答题页
  - 保持行数 ≤ 200行，UI逻辑尽量简化

**三次答对自动移除机制**:

- **What**: 某道题连续答对3次后，自动从错题本移除
- **Why**: 避免已掌握的题目长期占用错题本
- **How**:
  - 在 `recordController.js` 的 `submit` 函数中，为每道 detail 增加 `consecutiveCorrect` 计数
  - 或在 `getWrong` 中计算每道题的最近连续正确次数
  - **推荐方案**：在 `getWrong` 中统计，不改动数据结构
    ```javascript
    // 统计每道题的答题历史
    const questionHistory = {} // { questionId: [isCorrect, isCorrect, ...] }
    // 按时间排序后，计算最近连续正确次数
    // 如果最近连续正确 >= 3，则不加入错题列表
    ```
  - 更简单的方案：在 `details` 中增加 `consecutiveCorrect` 字段，每次提交时更新

**文件**: `backend/controllers/recordController.js` — `submit` 函数

- **What**: 为每道 detail 增加 `consecutiveCorrect` 字段
- **How**:
  ```javascript
  // 读取历史记录，计算该题连续正确次数
  const prevRecords = records.filter(r => r.userId === userId)
  const prevDetails = prevRecords.flatMap(r => r.details || []).filter(d => d.questionId === detail.questionId)
  const consecutiveCorrect = calculateConsecutiveCorrect(prevDetails, detail.isCorrect)
  detail.consecutiveCorrect = consecutiveCorrect
  ```

**文件**: `backend/controllers/recordController.js` — `getWrong` 函数

- **What**: 过滤掉 `consecutiveCorrect >= 3` 的题目
- **How**:
  ```javascript
  // 收集错题时检查
  if (d.isCorrect === false && (d.consecutiveCorrect || 0) < 3) {
    wrongIds.add(d.questionId)
  }
  ```

---

#### 4. 重点关注标记

**文件**: `backend/controllers/recordController.js`

- **What**: 新增 `markQuestion` 和 `unmarkQuestion` 函数
- **Why**: 用户需要标记重点题目，独立于对错状态
- **How**:
  ```javascript
  // 使用独立的 marks.json 存储标记关系
  // { userId, questionId, isMarked, createdAt }
  
  function markQuestion(req, res) {
    const { questionId, isMarked } = req.body
    const userId = req.user.id
    const marks = readJSON(MARKS_FILE)
    const existing = marks.find(m => m.userId === userId && m.questionId === questionId)
    if (existing) {
      existing.isMarked = isMarked
    } else {
      marks.push({ userId, questionId, isMarked, createdAt: new Date().toISOString() })
    }
    writeJSON(MARKS_FILE, marks)
    res.json({ message: '标记已更新' })
  }
  
  function getMarks(req, res) {
    const userId = req.user.id
    const marks = readJSON(MARKS_FILE)
    const userMarks = marks.filter(m => m.userId === userId)
    res.json({ list: userMarks })
  }
  ```

**文件**: `backend/routes/records.js`

- **What**: 新增路由
- **How**:
  ```javascript
  const { markQuestion, getMarks } = require('../controllers/recordController')
  router.post('/mark', auth, markQuestion)
  router.get('/marks', auth, getMarks)
  ```

**文件**: `frontend/src/api/records.js`

- **What**: 新增API函数
- **How**:
  ```javascript
  export function markQuestion(data) {
    return request.post('/records/mark', data)
  }
  
  export function getMarks() {
    return request.get('/records/marks')
  }
  ```

**文件**: `frontend/src/views/WrongBook.vue`

- **What**: 添加标记UI（星标按钮）
- **How**:
  - 每道错题标题旁添加星标图标（`el-icon` 或自定义）
  - 点击切换标记状态，调用 `markQuestion` API
  - 已标记题目显示填充星标，未标记显示空心星标
  - 筛选栏增加"只看标记"选项

---

## Assumptions & Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 题目类型赋值 | 根据现有题目内容手动标注 | 题库仅50题，自动判断不准确；判断题识别"正确/错误"类选项 |
| 三次答对移除的数据存储 | 在 `details` 中增加 `consecutiveCorrect` | 避免新增文件，与记录天然绑定 |
| 标记数据存储 | 新增 `marks.json` | 标记是独立维度，不应耦合到答题记录 |
| 错题本筛选实现 | 前端筛选（从全部错题中过滤） | 错题数量通常不多，减少后端复杂度 |
| WrongBook.vue 超行处理 | 抽 `useWrongBook.js` composable | 严格遵守 ≤ 200行限制 |
| recordController.js 超行处理 | 拆出 `recordService.js` | 新增mark相关函数后可能超150行 |

---

## Verification Steps

### 前置检查
1. 确认 `questions.json` 已备份
2. 确认 `records.json` 已备份
3. 运行 `npm run lint` 确认当前无ESLint错误

### 逐功能验证

**验证1：题目类型区分**
- [ ] 打开 `questions.json`，确认每道题都有 `type` 字段
- [ ] 启动前端，进入答题页，选择单选题A，再选B，确认A被取消、只有B被选中
- [ ] 检查判断题（如有）行为与单选题一致

**验证2：未答题不判错**
- [ ] 开始一组答题，故意留几题不答
- [ ] 提交后查看结果页，未答题显示"未答"而非"❌"
- [ ] 进入错题本，确认未答题未出现在错题列表中

**验证3：三次答对自动移除**
- [ ] 故意答错某题，确认进入错题本
- [ ] 连续3次答对该题（可通过单题答题模式 `/quiz?id=X`）
- [ ] 确认该题从错题本自动消失

**验证4：错题本筛选**
- [ ] 进入错题本，使用分类筛选，确认只显示对应分类
- [ ] 使用难度筛选，确认只显示对应难度
- [ ] 输入关键词搜索，确认标题匹配过滤

**验证5：批量重答**
- [ ] 在错题本勾选多道题
- [ ] 点击"批量重答"，确认跳转到答题页且题目正确加载
- [ ] 答题提交后，返回错题本确认状态更新

**验证6：重点关注标记**
- [ ] 在错题本点击星标标记某题
- [ ] 刷新页面，确认标记状态保持
- [ ] 筛选"只看标记"，确认只显示已标记题目
- [ ] 取消标记，确认状态更新

### 最终检查
- [ ] 运行 `npm run lint`，确认无文件超行、无函数超行
- [ ] 确认所有 `.vue` 文件 ≤ 200行
- [ ] 确认所有 `.js` 逻辑文件 ≤ 150行
- [ ] 确认所有函数 ≤ 30行
- [ ] 确认无组件内直接API调用
- [ ] 确认无裸 async/await 无 try-catch
- [ ] 端到端测试：完整答题流程 → 查看错题本 → 标记 → 批量重答 → 三次答对移除
