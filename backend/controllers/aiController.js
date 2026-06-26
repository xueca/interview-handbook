// 出题控制器: generate(非流式) / generateStream(SSE流式) | 数据流: routes/ai.js → callDeepSeek → DeepSeek → JSON/SS
const { callDeepSeek, initSSE, relaySSE } = require('../services/deepseekService')
const { repairJSON } = require('./aiParser')
const { GENERATE_SYSTEM, buildGeneratePrompt, buildAvoidHint } = require('./aiPrompt')

// 构造出题消息：system prompt + user prompt + 避重提示
function buildGenerateMessages({ category, difficulty, count }) {
  const prompt = buildGeneratePrompt({ category, difficulty, count }) + buildAvoidHint()
  return [
    { role: 'system', content: GENERATE_SYSTEM },
    { role: 'user', content: prompt }
  ]
}

// 非流式出题：调用 DeepSeek → 解析/修复 JSON → 返回题目数组
exports.generate = async (req, res) => {
  try {
    const { category = 'vue', difficulty = 'medium', count = 1 } = req.body
    const response = await callDeepSeek({ messages: buildGenerateMessages({ category, difficulty, count }), stream: false })
    const content = response.data.choices[0].message.content
    const questions = repairJSON(content)
    res.json({ code: 0, message: '生成成功', data: questions })
  } catch (e) {
    console.error('[generate] 错误:', e.message)
    res.status(500).json({ code: -1, message: '生成失败: ' + e.message, data: null })
  }
}

// 流式出题：SSE 转发 DeepSeek 流式响应，前端逐字渲染
exports.generateStream = async (req, res) => {
  try {
    // 修复：从 req.body 读取参数（前端 POST JSON），而非 req.query
    const { category = 'vue', difficulty = 'medium', count = 1 } = req.body
    // 先建立 SSE 通道再调上游：失败时 catch 里的错误事件才带正确的 text/event-stream 头（与 chatStream 对称）
    initSSE(res)
    const response = await callDeepSeek({ messages: buildGenerateMessages({ category, difficulty, count }), stream: true })
    relaySSE(response, res)
  } catch (error) {
    console.error('[generateStream] DeepSeek API 错误:', error.message)
    console.error('[generateStream] req.body:', JSON.stringify(req.body).slice(0, 200))
    console.error('[generateStream] req.body 类型:', typeof req.body)
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    } catch {
      // 响应可能已关闭
    }
  }
}
