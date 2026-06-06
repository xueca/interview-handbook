/**
 * 单元测试：验证 calcScore 的总答题数计算逻辑
 * 运行方式：node backend/tests/stats.test.mjs
 */
import { calcScore } from '../../frontend/src/utils/stats.js'
import assert from 'node:assert'

// 构造3道单选题作为测试数据
const questions = [
  { id: 1, title: 'Q1', options: ['A', 'B', 'C', 'D'], answer: 0, type: 'single' },
  { id: 2, title: 'Q2', options: ['A', 'B', 'C', 'D'], answer: 1, type: 'single' },
  { id: 3, title: 'Q3', options: ['A', 'B', 'C', 'D'], answer: 2, type: 'single' },
]

// Test 1: 全部答对 → answered = 3, correct = 3, score = 100%
{
  const res = calcScore(questions, { 1: [0], 2: [1], 3: [2] })
  assert.strictEqual(res.answered, 3, '全部答对时 answered 应为 3')
  assert.strictEqual(res.correct, 3, '全部答对时 correct 应为 3')
  assert.strictEqual(res.score, 100, '全部答对时 score 应为 100')
  assert.strictEqual(res.total, 3, 'total 应始终为题目总数 3')
  console.log('✅ Test 1 passed: 全部答对（3/3 = 100%）')
}

// Test 2: 部分答对部分答错 → answered = 3, correct = 1, score = 33%
{
  const res = calcScore(questions, { 1: [0], 2: [0], 3: [0] })
  assert.strictEqual(res.answered, 3, '答了3题时 answered 应为 3')
  assert.strictEqual(res.correct, 1, '只有1题答对')
  assert.strictEqual(res.score, 33, '1/3 ≈ 33%')
  console.log('✅ Test 2 passed: 部分答对部分答错（1/3 = 33%）')
}

// Test 3: 部分作答部分未作答 → answered = 2, correct = 1, score = 50%
// 核心场景：验证未回答的题目不计入总答题数
{
  const res = calcScore(questions, { 1: [0], 2: [0] })
  assert.strictEqual(res.answered, 2, '只答了2题，answered 应为 2（不含未作答）')
  assert.strictEqual(res.correct, 1, '只有1题答对')
  assert.strictEqual(res.score, 50, '1/2 = 50%')
  assert.strictEqual(res.total, 3, 'total 仍为题目总数 3（向后兼容）')
  console.log('✅ Test 3 passed: 部分作答部分未作答（1/2 = 50%，未作答不计入）')
}

// Test 4: 全部未作答 → answered = 0, correct = 0, score = 0
{
  const res = calcScore(questions, {})
  assert.strictEqual(res.answered, 0, '全部未作答时 answered 应为 0')
  assert.strictEqual(res.correct, 0, '全部未作答时 correct 应为 0')
  assert.strictEqual(res.score, 0, '全部未作答时 score 应为 0')
  console.log('✅ Test 4 passed: 全部未作答（0/0 = 0%）')
}

// Test 5: 总答题数 = 答对 + 答错（不含未作答）
{
  const res = calcScore(questions, { 1: [0], 2: [2], 3: [1] })
  const wrongCount = res.details.filter(d => d.isCorrect === false).length
  assert.strictEqual(res.answered, res.correct + wrongCount,
    '总答题数应等于答对数加答错数')
  console.log('✅ Test 5 passed: 总答题数 = 答对 + 答错（不含未作答）')
}

console.log('\n🎉 All 5 tests passed!')
