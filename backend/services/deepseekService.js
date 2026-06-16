// 文件功能: DeepSeek 调用与 SSE 转发统一封装 | 数据流: controllers → callDeepSeek/relaySSE → DeepSeek API → SSE
// 把 aiController 和 chatController 里重复的「HTTP 调用 + 流式转发」逻辑收口到一处，避免两份实现漂移

const axios = require('axios')

// 底层调用：统一 model/温度/超时/响应类型，调用方只需传 messages 和是否流式
// stream=true 时返回可读流（responseType:stream），false 时返回完整 JSON
function callDeepSeek({ messages, stream = false, timeout }) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DeepSeek API Key 未配置')

  return axios.post(
    'https://api.deepseek.com/chat/completions',
    { model: 'deepseek-v4-flash', messages, stream, temperature: 0.7, max_tokens: 2048 },
    {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // 非流式默认 10s、流式默认 30s；显式传 timeout 时优先
      timeout: timeout || (stream ? 30000 : 10000),
      responseType: stream ? 'stream' : 'json'
    }
  )
}

// 初始化 SSE 响应头并发送连接确认，前端据此建立 EventSource 流
function initSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  res.write(':connected\n\n')
}

/**
 * 把 DeepSeek 流式响应转发为前端 SSE 格式（data: {"content":"..."}）
 * @param {Object} upstream - axios 流式响应（responseType:stream）
 * @param {Object} res - Express 响应对象，已调用 initSSE
 * @returns {Function} endStream - 手动结束流的函数（防重复关闭）
 * @sideEffect 持续向 res 写入 SSE 数据，直到上游 end/error
 */
function relaySSE(upstream, res) {
  let ended = false
  // 防重复结束：data/end/error 多路径都可能触发收尾
  const endStream = () => {
    if (ended) return
    ended = true
    res.write('data: [DONE]\n\n')
    res.end()
  }

  upstream.data.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') { endStream(); return }
      try {
        // V4 双通道：reasoning_content 是模型自然语言推理（前端用于「思考中」打字效果），content 是正文/题目 JSON
        const delta = JSON.parse(data).choices[0].delta
        if (delta.reasoning_content) res.write(`data: ${JSON.stringify({ reasoning: delta.reasoning_content })}\n\n`)
        if (delta.content) res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`)
      } catch {
        // 跳过解析失败的行（半包/心跳）
      }
    }
  })
  upstream.data.on('end', endStream)
  upstream.data.on('error', (err) => {
    if (ended) return
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    endStream()
  })

  return endStream
}

module.exports = { callDeepSeek, initSSE, relaySSE }
