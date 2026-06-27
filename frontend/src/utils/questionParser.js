// 文件功能: AI 出题 JSON 解析与修复（纯函数）| 数据流: useAiChat done/降级 → tryParseQuestion/toQuestion → 题目对象 或 null
// 把流式拼接出来的不稳定 JSON 尽量修复成合法题目对象，避免「裸 JSON」直接渲染到页面

// 从字符串中提取 JSON 子串，支持 markdown ```json 代码块包裹
function extractJSON(str) {
  if (typeof str !== 'string') return null
  const match = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = match ? match[1].trim() : str.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return candidate.slice(start, end + 1)
  return null
}

// 修复 DeepSeek 流式输出常见缺陷：非法转义(\c) / 尾随逗号 / 括号未闭合
// 这些缺陷源自流式分块把结构字符切碎，是出题偶发「裸 JSON」的根本原因
function repair(s) {
  // 非法转义序列转义其反斜杠 + 去掉 } ] 前的尾随逗号
  let r = s.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1').replace(/,\s*([}\]])/g, '$1')
  // 流式被截断时按缺口数量补全闭合括号
  const fill = (open, close) => {
    const diff = (r.match(open) || []).length - (r.match(close) || []).length
    if (diff > 0) r += close.repeat(diff)
  }
  fill(/{/g, '}')
  fill(/\[/g, ']')
  return r
}

// 多策略解析：直接 → 提取子串 → 修复后再解析，任一成功即返回对象，全失败返回 null
function parseLoose(content) {
  if (typeof content !== 'string') return null
  const extracted = extractJSON(content)
  const candidates = [content, extracted, extracted && repair(extracted), repair(content)]
  for (const c of candidates) {
    if (!c) continue
    try { return JSON.parse(c) } catch { /* 尝试下一种策略 */ }
  }
  return null
}

// 规范化题目对象：处理数组包裹、对象格式 options、字符串 answer 等 AI 返回变体
function normalizeQuestion(raw) {
  let parsed = Array.isArray(raw) ? (raw[0] || {}) : raw
  // options 为对象数组 [{key,text}] 时转为字符串数组
  if (Array.isArray(parsed.options) && parsed.options.length > 0 && typeof parsed.options[0] === 'object') {
    parsed.options = parsed.options.map(o => o.text || o.key || '')
  }
  // answer 为字符串 key(A/B/C/D) 时转为数字索引
  if (typeof parsed.answer === 'string') {
    const idx = parsed.options.findIndex(o => o === parsed.answer)
    parsed.answer = idx >= 0 ? idx : (parsed.answer.charCodeAt(0) - 65)
  }
  return parsed
}

// 校验并规范化为合法题目对象（title + 非空 options 才算合格），不合格返回 null
function toQuestion(raw) {
  if (!raw) return null
  const q = normalizeQuestion(raw)
  if (q.title && Array.isArray(q.options) && q.options.length > 0) return q
  return null
}

// 从一段（可能不规范的）文本解析题目：成功返回 {type:'question', parsed}，失败返回 {type:'text', parsed:null}
function tryParseQuestion(content) {
  const q = toQuestion(parseLoose(content))
  return q ? { type: 'question', parsed: q } : { type: 'text', parsed: null }
}

export { tryParseQuestion, toQuestion }
