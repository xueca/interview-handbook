# 修复 Dashboard 分类显示为"未分类" Spec

## Why
用户从题库进入答题页后提交记录，Dashboard 的"分类正确率"和"薄弱知识点"均显示"未分类"。根本原因是 `category` 参数未从题库传递到答题页，导致后端保存记录时 `category` 为空字符串。

## What Changes
- **QuestionBank.vue**: `goToQuiz()` 和 `startQuiz()` 在路由跳转时附加 `category` 参数
- **useQuiz.js**: `handleSubmit()` 中若 `route.query.category` 为空，兜底从 `questions[0].category` 获取

## Impact
- Affected code: `frontend/src/views/QuestionBank.vue`, `frontend/src/composables/useQuiz.js`
- Dashboard 图表和薄弱知识点将按真实分类展示

## ADDED Requirements
### Requirement: 分类参数正确传递
The system SHALL ensure `category` is correctly passed when navigating from QuestionBank to Quiz page.

#### Scenario: 点击单个题目进入答题
- **WHEN** 用户在题库点击某题的"查看详情"
- **THEN** 路由跳转携带该题的 `category`

#### Scenario: 批量开始答题
- **WHEN** 用户在题库筛选分类后点击"开始答题"
- **THEN** 路由跳转携带当前筛选的 `category`

#### Scenario: 兜底获取分类
- **WHEN** 答题页 URL 无 `category` 参数
- **THEN** `handleSubmit` 从已加载的题目列表第一题获取 `category`

## MODIFIED Requirements
无

## REMOVED Requirements
无
