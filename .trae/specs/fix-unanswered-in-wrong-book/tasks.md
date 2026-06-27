# Tasks
- [x] Task 1: 修复 `calcConsecutive` 函数
  - [x] 未作答（`isCorrect === null`）时，查找该题最近一次有效记录的 `consecutiveCorrect` 并返回，保持连续正确次数不中断
  - [x] 函数行数 ≤ 30 行
- [x] Task 2: 修复 `getWrong` 函数
  - [x] 遍历 `details` 时，跳过 `isCorrect === null` 的记录
  - [x] 确保只有「实际作答且答错」的题目进入错题本
  - [x] 函数行数 ≤ 30 行（新增逻辑部分）
- [x] Task 3: 验证修复
  - [x] 后端 `check-size` 通过
  - [x] `recordController.js` 120 行 ≤ 150 行
  - [x] 未作答题目不再出现在错题本列表中
  - [x] 连续答对次数不因未作答而中断

# Task Dependencies
- Task 2 依赖 Task 1（`getWrong` 依赖 `calcConsecutive` 的正确计算）
