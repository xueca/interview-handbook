/**
 * AI 响应解析工具
 * 处理 DeepSeek V4 流式响应和 JSON 修复
 */

/**
 * 修复 AI 返回的不完整 JSON
 * @param {string} str - AI 返回的字符串
 * @returns {object} - 解析后的对象
 */
function repairJSON(str) {
  // 移除可能的 markdown 代码块标记
  let cleaned = str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  // 尝试直接解析
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // 尝试补全不完整的 JSON
    const openBraces = (cleaned.match(/{/g) || []).length
    const closeBraces = (cleaned.match(/}/g) || []).length
    if (openBraces > closeBraces) {
      cleaned += '}'.repeat(openBraces - closeBraces)
    }
    const openBrackets = (cleaned.match(/\[/g) || []).length
    const closeBrackets = (cleaned.match(/\]/g) || []).length
    if (openBrackets > closeBrackets) {
      cleaned += ']'.repeat(openBrackets - closeBrackets)
    }
    return JSON.parse(cleaned)
  }
}

/**
 * 解析 DeepSeek V4 流式 chunk
 * @param {string} chunk - SSE 数据块
 * @returns {string|null} - 提取的文本内容，过滤 reasoning_content
 */
function parseStreamChunk(chunk) {
  const lines = chunk.split('\n')
  let content = ''
  for (const line of lines) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') continue
    try {
      const json = JSON.parse(data)
      // V4 模型：只取 content，过滤 reasoning_content
      const delta = json.choices?.[0]?.delta
      if (delta?.content) content += delta.content
    } catch (e) {
      // 忽略解析失败的行
    }
  }
  return content || null
}

module.exports = { repairJSON, parseStreamChunk }
