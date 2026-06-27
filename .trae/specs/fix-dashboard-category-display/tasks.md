# Tasks

- [x] Task 1: 修复 QuestionBank.vue 路由跳转时传递 category 参数
  - [x] SubTask 1.1: `goToQuiz(question)` 附加 `category: question.category`
  - [x] SubTask 1.2: `startQuiz()` 附加 `category: filter.value.category`
- [x] Task 2: 修复 useQuiz.js handleSubmit 兜底获取 category
  - [x] SubTask 2.1: 若 `route.query.category` 为空，取 `questions.value[0]?.category`
- [x] Task 3: 验证修复结果
  - [x] SubTask 3.1: ESLint 0 Error
  - [x] SubTask 3.2: 文件大小合规
  - [x] SubTask 3.3: 功能验证（从题库进入答题→提交→Dashboard 显示正确分类）

# Task Dependencies
- Task 2 depends on Task 1（URL 参数优先，兜底为后备方案）
