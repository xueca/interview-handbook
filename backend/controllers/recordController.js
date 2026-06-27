const { readJSON, writeJSON } = require('../data')
const RECORDS_FILE = 'records.json'
const QUESTIONS_FILE = 'questions.json'
const MARKS_FILE = 'marks.json'

// 查找该题最近一次有效（已作答）记录
function findLastValid(questionId, userId, records) {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i]
    if (r.userId !== userId) continue
    const d = (r.details || []).find(d => d.questionId === questionId && d.isCorrect !== null)
    if (d) return d
  }
  return null
}

// 计算每道题的连续正确次数（答错归零，答对+1，未作答保持上次值）
function calcConsecutive(questionId, userId, isCorrect, records) {
  if (isCorrect === false) return 0
  const last = findLastValid(questionId, userId, records)
  if (isCorrect === null) return last ? (last.consecutiveCorrect || 0) : 0
  return last ? (last.consecutiveCorrect || 0) + 1 : 1
}

function submit(req, res) {
  const { score, correct, total, timeUsed, details, category, source } = req.body
  const answered = req.body.answered
  const userId = req.user.id
  if (!score && score !== 0) return res.status(400).json({ error: '缺少分数' })
  const records = readJSON(RECORDS_FILE)
  // 为每道题计算consecutiveCorrect
  const enrichedDetails = (details || []).map(d => ({
    ...d,
    consecutiveCorrect: calcConsecutive(d.questionId, userId, d.isCorrect, records)
  }))
  // source='wrong-book' 表示错题本重答，仅更新连续答对进度，不计入答题统计
  const record = { id: `rec_${Date.now()}`, userId, score, correct, total, answered, timeUsed, category, source: source || 'normal', details: enrichedDetails, createdAt: new Date().toISOString() }
  records.push(record)
  writeJSON(RECORDS_FILE, records)
  res.json({ message: '记录已保存', record })
}

function getRecords(req, res) {
  const userRecords = readJSON(RECORDS_FILE).filter(r => r.userId === req.user.id)
  res.json({ total: userRecords.length, list: userRecords })
}

// 按题目去重聚合：遍历该用户所有记录（含错题本重答），每题只保留最近一次有效作答
// records 按时间顺序 push，后面的 detail 覆盖前面的即得最近一次；总答题数=做过的不同题数
function aggregateByQuestion(records) {
  const perQ = {}
  records.forEach(r => {
    (r.details || []).forEach(d => {
      if (d.isCorrect == null) return // 跳过未作答（null/undefined）
      perQ[d.questionId] = d
    })
  })
  return perQ
}

// 题目维度统计：按「最近一次对错」聚合出分类正确率 + 薄弱点TOP5（一次遍历）
function buildTopicStats(perQ, qMap) {
  const catMap = {}, weakMap = {}
  Object.entries(perQ).forEach(([qid, d]) => {
    const c = qMap[qid]?.category || '未分类'
    if (!catMap[c]) catMap[c] = { category: c, correct: 0, total: 0 }
    catMap[c].total++
    if (d.isCorrect === true) catMap[c].correct++
    else if (d.isCorrect === false) weakMap[c] = { topic: c, wrongCount: (weakMap[c]?.wrongCount || 0) + 1 }
  })
  const categoryStats = Object.values(catMap).map(c => ({ category: c.category, rate: c.total ? Math.round((c.correct / c.total) * 100) : 0, total: c.total }))
  const weakTopics = Object.values(weakMap).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5)
  return { categoryStats, weakTopics }
}

// 会话维度每日正确率趋势（最近7天）：按场次累加，已排除错题本重答
function buildDailyTrend(sessionRecords) {
  const dayMap = {}
  const now = new Date()
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const k = d.toISOString().slice(0, 10); dayMap[k] = { date: k, correct: 0, total: 0 } }
  sessionRecords.forEach(r => { const k = r.createdAt?.slice(0, 10); if (dayMap[k]) { dayMap[k].correct += r.correct; dayMap[k].total += (r.answered || r.total) } })
  return Object.values(dayMap).map(d => ({ date: d.date, rate: d.total ? Math.round((d.correct / d.total) * 100) : 0 }))
}

function getStats(req, res) {
  const allUserRecords = readJSON(RECORDS_FILE).filter(r => r.userId === req.user.id)
  const empty = { totalQuizzes: 0, avgScore: 0, totalQuestions: 0, totalCorrect: 0, dailyTrend: [], categoryStats: [], weakTopics: [] }
  if (!allUserRecords.length) return res.json(empty)
  const qMap = Object.fromEntries(readJSON(QUESTIONS_FILE).map(q => [q.id, q]))
  // 题目维度（去重，含错题本重答）：总答题数=做过的不同题数，正确率=每题最近一次对错
  const perQ = aggregateByQuestion(allUserRecords)
  const totalQuestions = Object.keys(perQ).length
  const totalCorrect = Object.values(perQ).filter(d => d.isCorrect === true).length
  const { categoryStats, weakTopics } = buildTopicStats(perQ, qMap)
  // 会话维度（排除错题本重答）：答题次数/平均分/每日趋势，按「每场答题」统计
  const sessionRecords = allUserRecords.filter(r => r.source !== 'wrong-book')
  const totalQuizzes = sessionRecords.length
  const avgScore = totalQuizzes ? Math.round(sessionRecords.reduce((s, r) => s + r.score, 0) / totalQuizzes) : 0
  const dailyTrend = buildDailyTrend(sessionRecords)
  res.json({ totalQuizzes, avgScore, totalQuestions, totalCorrect, dailyTrend, categoryStats, weakTopics })
}

function getWrong(req, res) {
  const userId = req.user.id
  const records = readJSON(RECORDS_FILE)
  const qMap = Object.fromEntries(readJSON(QUESTIONS_FILE).map(q => [q.id, q]))
  // 按题目聚合历史：everWrong 标记是否曾经做错过，latest 保留最新一条 detail
  // 错题本的语义是「做错过的题」，所以必须按整条历史判断，不能只看最新一条
  const perQ = {}
  records.filter(r => r.userId === userId).forEach(r => {
    (r.details || []).forEach(d => {
      if (d.isCorrect === null) return // 跳过未作答记录
      if (!perQ[d.questionId]) perQ[d.questionId] = { everWrong: false, latest: null }
      if (d.isCorrect === false) perQ[d.questionId].everWrong = true
      // records 按时间顺序 push，覆盖即可保留最新
      perQ[d.questionId].latest = d
    })
  })
  // 错题本：曾经做错过 且 最新一次的连续正确次数<3
  const wrongList = Object.entries(perQ)
    .filter(([, v]) => v.everWrong && (v.latest.consecutiveCorrect || 0) < 3)
    .map(([questionId, v]) => {
      const q = qMap[questionId]
      return q ? { id: q.id, title: q.title, options: q.options, answer: q.answer, analysis: q.analysis, category: q.category, difficulty: q.difficulty, userAnswer: v.latest.userAnswer, consecutiveCorrect: v.latest.consecutiveCorrect || 0 } : null
    }).filter(Boolean)
  // 已掌握（自动移除）的题数：曾经做错过 且 已连续答对≥3次
  const masteredCount = Object.values(perQ)
    .filter(v => v.everWrong && (v.latest.consecutiveCorrect || 0) >= 3).length
  res.json({ total: wrongList.length, list: wrongList, masteredCount })
}

function toggleMark(req, res) {
  const { questionId, isMarked } = req.body
  const userId = req.user.id
  if (!questionId) return res.status(400).json({ error: '缺少题目ID' })
  const marks = readJSON(MARKS_FILE)
  const idx = marks.findIndex(m => m.userId === userId && m.questionId === questionId)
  if (isMarked && idx === -1) marks.push({ userId, questionId, createdAt: new Date().toISOString() })
  else if (!isMarked && idx !== -1) marks.splice(idx, 1)
  writeJSON(MARKS_FILE, marks)
  res.json({ message: '标记已更新', isMarked })
}

function getMarks(req, res) {
  const userMarks = readJSON(MARKS_FILE).filter(m => m.userId === req.user.id)
  res.json({ list: userMarks.map(m => m.questionId) })
}

module.exports = { submit, getRecords, getStats, getWrong, toggleMark, getMarks }
