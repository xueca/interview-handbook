/**
 * AI Prompt 常量定义
 * 所有 systemPrompt 只在此文件定义一次，禁止在其他文件重复
 */

const SYSTEM_PROMPTS = {
  generate: `你是一个面试题生成助手。根据用户输入的主题，生成一道前端面试题。
返回格式必须是纯JSON，不要有任何markdown标记：
{"title":"题目内容","options":["选项A","选项B","选项C","选项D"],"answer":0,"analysis":"解析内容","category":"分类","difficulty":"easy|medium|hard"}`,

  chat: `你是一个前端面试辅导助手。用户会问你技术问题，请用简洁清晰的语言回答。`,

  analyze: `你是一个面试题解析助手。用户会给你一道题目和用户的答案，请分析答案是否正确，并给出详细解释。`
}

// 出题场景的 system prompt：强约束 JSON 语法正确，供 generate / generateStream 共用
const GENERATE_SYSTEM = '你是一个专业的前端面试出题专家。请严格按照要求的格式输出题目 JSON。必须确保输出的 JSON 语法正确：所有字符串值必须用双引号包围，不能有尾随逗号，数组和对象必须完整闭合。'

// 构造出题 user prompt：把分类/难度/数量套进固定 JSON 模板，generate 和 generateStream 共用同一份
// 避免同一段超长模板在两个接口里各写一遍（之前 aiController 重复了两份）
function buildGeneratePrompt({ category, difficulty, count }) {
  return `请出 ${count} 道关于 "${category}" 的面试题，难度：${difficulty}。要求是选择题。请严格按照以下 JSON 格式输出，只输出 JSON，不要包含任何其他文字：
{
  "title": "题目内容",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": 0,
  "analysis": "详细解析",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "type": "single",
  "tags": ["相关标签"]
}

重要：options 字段必须是字符串数组（如 ["选项A", "选项B"]），answer 字段必须是数字（0表示A, 1表示B, 2表示C, 3表示D）。必须输出完整的 JSON 对象，以 { 开头以 } 结尾。`
}

// 构造「避重提示」：把题库最近 30 道题干喂给 AI，让它出题时避开重复或高度相似的考点
// 从源头减少相似题产生（软约束，AI 不保证 100% 遵守，入库端归一化去重仍是兜底）
// 限 30 条防止 prompt 过长导致 token 成本飙升；题库为空时返回空串，不干扰原 prompt
function buildAvoidHint() {
  const { readJSON } = require('../data')
  const questions = readJSON('questions.json')
  if (!Array.isArray(questions) || questions.length === 0) return ''
  const recent = questions.slice(-30).map(q => `- ${q.title}`).join('\n')
  return `\n\n【已有题库，请勿出与以下重复或高度相似的题】\n${recent}`
}

module.exports = { SYSTEM_PROMPTS, buildAvoidHint, GENERATE_SYSTEM, buildGeneratePrompt }
