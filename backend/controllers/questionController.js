const { readJSON } = require('../data')

const QUESTIONS_FILE = 'questions.json'

/**
 * 自动拆分 title 中的行内代码
 * 匹配模式：中文问号后跟 JavaScript 代码特征
 */
function splitTitleCode(raw) {
  const match = raw.match(/^([^？]*？)\s*(.+)$/)
  if (!match) return { title: raw, code: null }

  const possibleCode = match[2].trim()
  const codePattern = /=>|console\.|setTimeout|setInterval|Promise\.|\.then\(|await\s|function\s*\(|[;=]\)/
  if (codePattern.test(possibleCode)) {
    return { title: match[1], code: possibleCode }
  }
  return { title: raw, code: null }
}

function getList(req, res) {
  const { category, difficulty, keyword, num } = req.query
  let questions = readJSON(QUESTIONS_FILE)

  // 统一拆分 title 中的行内代码
  questions = questions.map(q => {
    const { title, code } = splitTitleCode(q.title)
    return { ...q, title, ...(code ? { code } : {}) }
  })

  if (category) {
    questions = questions.filter(q => q.category === category)
  }
  if (difficulty) {
    questions = questions.filter(q => q.difficulty === difficulty)
  }
  if (keyword) {
    const kw = keyword.toLowerCase()
    questions = questions.filter(q =>
      q.title.toLowerCase().includes(kw) ||
      (q.code && q.code.toLowerCase().includes(kw)) ||
      q.analysis.toLowerCase().includes(kw)
    )
  }
  if (num) {
    const count = Math.min(parseInt(num), questions.length)
    questions = questions.slice(0, count)
  }

  res.json({ total: questions.length, list: questions })
}

function getDetail(req, res) {
  const id = parseInt(req.params.id)
  const questions = readJSON(QUESTIONS_FILE)
  const question = questions.find(q => q.id === id)

  if (!question) {
    return res.status(404).json({ error: '题目不存在' })
  }

  const { title, code } = splitTitleCode(question.title)
  res.json({ ...question, title, ...(code ? { code } : {}) })
}

module.exports = { getList, getDetail }
