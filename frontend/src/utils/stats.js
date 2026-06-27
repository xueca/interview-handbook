/**
 * 检查答案是否正确（支持单选/多选/判断）
 * @param {number[]} userAns - 用户选择的选项索引数组
 * @param {number|number[]} correctAns - 正确答案（单选/判断为数字，多选为数组）
 * @param {string} type - 题目类型：single/multiple/judge
 */
function checkAnswer(userAns, correctAns, type = 'single') {
  if (type === 'multiple') {
    // 多选：排序后比较数组内容
    const userSorted = [...userAns].sort().join(',')
    const correctSorted = Array.isArray(correctAns)
      ? [...correctAns].sort().join(',')
      : String(correctAns)
    return userSorted === correctSorted
  }
  // 单选/判断：只比较第一个
  return userAns[0] === correctAns
}

export function calcScore(questions, userAnswers) {
  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
  let correct = 0
  let answered = 0 // 用户实际作答的题目数（不含未回答）
  const details = []
  questions.forEach(q => {
    const ans = userAnswers[q.id]
    const hasAnswer = ans?.length > 0
    const userLabel = hasAnswer ? ans.map(i => LABELS[i]).join('') : ''
    // 未答题：isCorrect = null，不判错也不判对
    const isCorrect = hasAnswer ? checkAnswer(ans, q.answer, q.type) : null
    if (hasAnswer) answered++ // 只要有作答即计入答题数
    if (isCorrect === true) correct++
    details.push({
      questionId: q.id, title: q.title, options: q.options,
      userAnswer: userLabel, correctAnswer: Array.isArray(q.answer) ? q.answer.map(i => LABELS[i]).join('') : (LABELS[q.answer] || String(q.answer)),
      analysis: q.analysis || '', isCorrect, type: q.type || 'single'
    })
  })
  // 修正：正确率基于实际答题数，而非题目总数
  const score = answered > 0 ? Math.round((correct / answered) * 100) : 0
  return { score, correct, total: questions.length, answered, details }
}

export function calcTimeUsed(initialSeconds, remainingSeconds) {
  return initialSeconds - remainingSeconds
}

export function formatSeconds(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${s}秒`
}
