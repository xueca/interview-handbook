// 文件功能: AI 对话控制器（纯模型问答，无 RAG）| 数据流: routes/ai.js → chat()/chatStream() → deepseekService → DeepSeek → JSON/SSE
// 直接把用户问题交给 DeepSeek 回答；底层调用复用 deepseekService。原 RAG 检索增强已移除（本地 embedding 拖慢响应）

const { callDeepSeek, initSSE, relaySSE } = require('../services/deepseekService')
const { SYSTEM_PROMPTS } = require('./aiPrompt')

// 构建对话消息：固定的辅导助手 system + 用户问题，chat / chatStream 共用
function buildMessages(question) {
  return [
    { role: 'system', content: SYSTEM_PROMPTS.chat },
    { role: 'user', content: question }
  ]
}

// ── 非流式对话 ──
// 直接调用 DeepSeek，返回完整回答（sources 恒为空数组，保持响应结构与前端兼容）
exports.chat = async (req, res) => {
  try {
    const { question } = req.body
    if (!question) {
      return res.status(400).json({ code: -1, message: 'question 不能为空', data: null })
    }
    const response = await callDeepSeek({ messages: buildMessages(question), stream: false, timeout: 30000 })
    const content = response.data.choices[0].message.content
    res.json({ code: 0, message: '成功', data: { content, sources: [] } })
  } catch (error) {
    console.error('[chat] 错误:', error.message)
    res.status(500).json({ code: -1, message: error.message, data: null })
  }
}

// ── SSE 流式对话 ──
// 把 DeepSeek 流式响应经 relaySSE 转发给前端（与原链路一致，仅去掉检索状态/来源推送）
exports.chatStream = async (req, res) => {
  try {
    // 兼容前端 GET query 与 POST body 两种传参
    const question = req.query.question || (req.body && req.body.question)
    if (!question) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: -1, message: 'question 不能为空' }))
      return
    }
    initSSE(res)
    const response = await callDeepSeek({ messages: buildMessages(question), stream: true, timeout: 30000 })
    relaySSE(response, res)
  } catch (error) {
    console.error('[chatStream] DeepSeek API 错误:', error.message)
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    } catch {
      // 响应可能已关闭
    }
  }
}
