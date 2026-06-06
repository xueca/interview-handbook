const { readJSON, writeJSON } = require('../data')
const RECORDS_FILE = 'records.json'
const QUESTIONS_FILE = 'questions.json'
const MARKS_FILE = 'marks.json'

function submit(req, res) {
  const { score, correct, total, timeUsed, details, category } = req.body
  const answered = req.body.answered
  const userId = req.user.id
  if (!score && score !== 0) return res.status(400).json({ error: '缺少分数' })
  const records = readJSON(RECORDS_FILE)
  const record = { id: `rec_${Date.now()}`, userId, score, correct, total, answered, timeUsed, category, details, createdAt: new Date().toISOString() }
  records.push(record)
  writeJSON(RECORDS_FILE, records)
  res.json({ message: '记录已保存', record })
}

function getRecords(req, res) {
  const userRecords = readJSON(RECORDS_FILE).filter(r => r.userId === req.user.id)
  res.json({ total: userRecords.length, list: userRecords })
}

function getStats(req, res) {
  const userRecords = readJSON(RECORDS_FILE).filter(r => r.userId === req.user.id)
  const empty = { totalQuizzes: 0, avgScore: 0, totalQuestions: 0, totalCorrect: 0, dailyTrend: [], categoryStats: [], weakTopics: [] }
  if (!userRecords.length) return res.json(empty)
  const totalQuizzes = userRecords.length
  const avgScore = Math.round(userRecords.reduce((s, r) => s + r.score, 0) / totalQuizzes)
  // 修正：总答题数使用 answered（实际作答数），兼容旧数据回退到 total
  const totalQuestions = userRecords.reduce((s, r) => s + (r.answered || r.total), 0)
  const totalCorrect = userRecords.reduce((s, r) => s + r.correct, 0)
  // 每日正确率趋势（最近7天）
  const dayMap = {}
  const now = new Date()
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const k = d.toISOString().slice(0, 10); dayMap[k] = { date: k, correct: 0, total: 0 } }
  userRecords.forEach(r => { const k = r.createdAt?.slice(0, 10); if (dayMap[k]) { dayMap[k].correct += r.correct; dayMap[k].total += (r.answered || r.total) } })
  const dailyTrend = Object.values(dayMap).map(d => ({ date: d.date, rate: d.total ? Math.round((d.correct / d.total) * 100) : 0 }))
  // 分类正确率
  const catMap = {}
  userRecords.forEach(r => { const c = r.category || '未分类'; if (!catMap[c]) catMap[c] = { category: c, correct: 0, total: 0 }; catMap[c].correct += r.correct; catMap[c].total += (r.answered || r.total) })
  const categoryStats = Object.values(catMap).map(c => ({ category: c.category, rate: c.total ? Math.round((c.correct / c.total) * 100) : 0, total: c.total }))
  // 薄弱知识点TOP5
  const weakMap = {}
  userRecords.forEach(r => { const cat = r.category || '未分类'; (r.details || []).forEach(d => { if (d.isCorrect === false) { if (!weakMap[cat]) weakMap[cat] = { topic: cat, wrongCount: 0 }; weakMap[cat].wrongCount++ } }) })
  const weakTopics = Object.values(weakMap).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5)
  res.json({ totalQuizzes, avgScore, totalQuestions, totalCorrect, dailyTrend, categoryStats, weakTopics })
}

function getWrong(req, res) {
  const userId = req.user.id
  const records = readJSON(RECORDS_FILE)
  const qMap = Object.fromEntries(readJSON(QUESTIONS_FILE).map(q => [q.id, q]))
  const wrongIds = new Set()
  records.filter(r => r.userId === userId).forEach(r => {
    (r.details || []).forEach(d => { if (d.isCorrect === false) wrongIds.add(d.questionId) })
  })
  const wrongList = [...wrongIds].map(id => { const q = qMap[id]; return q ? { id: q.id, title: q.title, options: q.options, answer: q.answer, analysis: q.analysis, category: q.category, difficulty: q.difficulty } : null }).filter(Boolean)
  res.json({ total: wrongList.length, list: wrongList })
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
