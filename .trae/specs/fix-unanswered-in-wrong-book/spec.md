# Fix Unanswered Questions in Wrong Book Spec

## Why
用户未作答的题目被错误计入了错题本。截图显示"你的答案：未记录"，说明该题用户从未选择答案，但因后端 `getWrong` 未过滤未作答记录，导致其出现在错题列表中。

## What Changes
- **后端 `recordController.js`**：
  1. `calcConsecutive`：未作答（`isCorrect === null`）时保持上次连续正确次数，不中断
  2. `getWrong`：遍历 `details` 时跳过 `isCorrect === null` 的记录
- **前端 `utils/stats.js`**：无需修改，`calcScore` 已正确设置 `isCorrect = null` 和 `userAnswer = ''`

## Impact
- 错题本只包含「用户实际作答且答错」的题目
- 未作答不再影响连续正确次数统计
- 不影响已保存的历史数据（修复后读取时自动过滤）

## ADDED Requirements
### Requirement: 未作答题目不进入错题本
- **WHEN** 用户提交答题但某题未作答（`isCorrect = null`）
- **THEN** 该题不应出现在 `GET /api/records/wrong` 返回的列表中
- **AND** 该题的 `consecutiveCorrect` 保持上次有效值不变

### Requirement: 连续正确次数不因未作答中断
- **WHEN** 用户连续答对2次后，第3次未作答
- **THEN** 该题 `consecutiveCorrect` 仍为 2（不中断、不归零）
- **AND** 下次答对后变为 3（正常累加）

## MODIFIED Requirements
### Requirement: getWrong 错题聚合逻辑
**原逻辑**：遍历所有 `details`，未作答也会覆盖 `latest`
**新逻辑**：仅遍历 `isCorrect !== null` 的 `details`，未作答完全跳过
