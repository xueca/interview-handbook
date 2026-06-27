const { readJSON } = require('../data')

const QUESTIONS_FILE = 'questions.json'
const MARKS_FILE = 'marks.json'  // 删题时级联清理

// 归一化题干：去首尾+压缩内部空白、中文标点转半角、转小写
// 用途：让「闭包是什么？」和「闭包是什么? 」被判定为同一道题，挡住标点/空格/大小写差异的伪重复
function normalizeTitle(raw) {
  if (typeof raw !== 'string') return ''
  // 常见全角标点 → 半角，统一比对口径
  const punctMap = { '？': '?', '！': '!', '，': ',', '：': ':', '；': ';', '（': '(', '）': ')', '　': ' ' }
  return raw
    .replace(/[？！，：；（）　]/g, ch => punctMap[ch])
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

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

function createQuestion(req, res) {
  const { title, options, answer, analysis, category, difficulty } = req.body
  if (!title || !Array.isArray(options) || typeof answer !== 'number') {
    return res.status(400).json({ error: '缺少必要字段' })
  }
  const questions = readJSON(QUESTIONS_FILE)
  // 按归一化题干去重：同一道题只入库一次，重复时回传已有题目并标记 duplicated
  // 防止 AI 对话里反复点「加入题库」导致题库出现重复/标点空格大小写差异的伪重复题
  const normTitle = normalizeTitle(title)
  const existing = questions.find(q => normalizeTitle(q.title) === normTitle)
  if (existing) {
    return res.json({ ...existing, duplicated: true })
  }
  const maxId = questions.reduce((max, q) => Math.max(max, q.id || 0), 0)
  const newQuestion = {
    id: maxId + 1,
    title,
    options,
    answer,
    analysis: analysis || '',
    category: category || '其他',
    difficulty: difficulty || 'medium',
    type: 'single'
  }
  questions.push(newQuestion)
  const { writeJSON } = require('../data')
  writeJSON(QUESTIONS_FILE, questions)
  res.status(201).json(newQuestion)
}

/**
 * 删除题目（物理删除）+ 级联清理 marks
 * @sideEffect 写入 questions.json 和 marks.json
 * 注意：不动 records.json，错题本读取已做容错（recordController.getWrong 过滤 null）
 */
function removeQuestion(req, res) {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: '题目ID无效' })

  const questions = readJSON(QUESTIONS_FILE)
  const idx = questions.findIndex(q => q.id === id)
  if (idx === -1) return res.status(404).json({ error: '题目不存在' })

  const { writeJSON } = require('../data')
  questions.splice(idx, 1)
  writeJSON(QUESTIONS_FILE, questions)
  // 级联：把所有指向该题的标记删掉，避免孤儿记录
  const marks = readJSON(MARKS_FILE).filter(m => m.questionId !== id)
  writeJSON(MARKS_FILE, marks)

  res.json({ message: '题目已删除', id })
}

module.exports = { getList, getDetail, createQuestion, removeQuestion }
