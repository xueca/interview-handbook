const axios = require('axios')

// 1. 底层封装：callDeepSeek(prompt, stream = false)
async function callDeepSeek({ prompt, systemPrompt, stream = false }) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DeepSeek API Key 未配置')
  }

  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-v4-flash',
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 2048
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: stream ? 30000 : 10000,
      responseType: stream ? 'stream' : 'json'
    }
  )

  return response
}

// 2. 非流式接口：exports.generate
exports.generate = async (req, res) => {
  try {
    const { category = 'vue', difficulty = 'medium', count = 1 } = req.body

    const systemPrompt = '你是一个专业的前端面试出题专家。请严格按照要求的格式输出题目 JSON。必须确保输出的 JSON 语法正确：所有字符串值必须用双引号包围，不能有尾随逗号，数组和对象必须完整闭合。'

      const prompt = `请出 ${count} 道关于 "${category}" 的面试题，难度：${difficulty}。
要求是选择题。

请严格按照以下 JSON 数组格式输出，只输出 JSON，不要包含任何其他文字：
[
  {
    "title": "题目内容",
    "options": [
      { "key": "A", "text": "选项A" },
      { "key": "B", "text": "选项B" },
      { "key": "C", "text": "选项C" },
      { "key": "D", "text": "选项D" }
    ],
    "answer": "正确选项key",
    "analysis": "详细解析",
    "category": "${category}",
    "difficulty": "${difficulty}",
    "type": "single",
    "tags": ["相关标签"]
  }
]

重要：answer 字段的值必须是双引号包围的字符串，例如 "answer": "A"，不要写成 "answer":A。必须输出完整的 JSON 数组，以 [ 开头以 ] 结尾。`

    const response = await callDeepSeek({ prompt, systemPrompt, stream: false })
    const content = response.data.choices[0].message.content
    let cleanContent = content.trim()

    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(cleanContent.indexOf('\n') + 1)
      const lastIndex = cleanContent.lastIndexOf('```')
      if (lastIndex !== -1) {
        cleanContent = cleanContent.slice(0, lastIndex).trim()
      }
    }

    const questions = JSON.parse(cleanContent)
    res.json({ code: 0, message: '生成成功', data: questions })
  } catch (e) {
    console.error('JSON 解析失败，尝试正则提取...', e.message)
    const content = e.message
    const titleMatch = content.match(/"title"\s*:\s*"([^"]+)"/)
    const answerMatch = content.match(/"answer"\s*:\s*"([^"]+)"/)

    if (titleMatch && answerMatch) {
      res.json({
        code: 1,
        message: 'JSON解析失败，已用正则提取部分数据',
        data: [{
          title: titleMatch[1],
          options: [],
          answer: answerMatch[1],
          analysis: '解析提取失败，请查看原始返回'
        }]
      })
    } else {
      res.status(500).json({ code: -1, message: '生成失败', data: null })
    }
  }
}

// 3. 流式接口：exports.generateStream
exports.generateStream = async (req, res) => {
  try {
    const { category = 'vue', difficulty = 'medium', count = 1 } = req.query

    const systemPrompt = '你是一个专业的前端面试出题专家。请严格按照要求的格式输出题目 JSON。必须确保输出的 JSON 语法正确：所有字符串值必须用双引号包围，不能有尾随逗号，数组和对象必须完整闭合。'

    const prompt = `请出 ${count} 道关于 "${category}" 的面试题，难度：${difficulty}。要求是选择题。请严格按照以下 JSON 数组格式输出，只输出 JSON，不要包含任何其他文字：
[
  {
    "title": "题目内容",
    "options": [
      { "key": "A", "text": "选项A" },
      { "key": "B", "text": "选项B" },
      { "key": "C", "text": "选项C" },
      { "key": "D", "text": "选项D" }
    ],
    "answer": "正确选项key",
    "analysis": "详细解析",
    "category": "${category}",
    "difficulty": "${difficulty}",
    "type": "single",
    "tags": ["相关标签"]
  }
]

重要：answer 字段的值必须是双引号包围的字符串，例如 "answer": "A"，不要写成 "answer":A。必须输出完整的 JSON 数组，以 [ 开头以 ] 结尾。`

    const response = await callDeepSeek({ prompt, systemPrompt, stream: true })

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })
    res.write(':connected\n\n')

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n')
            res.end()
            return
          }

          try {
            const parsed = JSON.parse(data)
            const text = parsed.choices[0].delta.content || ''
            if (text) {
              res.write(`data: ${JSON.stringify({ content: text })}\n\n`)
            }
          } catch (err) {
            // 跳过解析失败的行
          }
        }
      }
    })

    response.data.on('end', () => {
      res.write('data: [DONE]\n\n')
      res.end()
    })

    response.data.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    })
  } catch (error) {
    console.error('DeepSeek API 错误:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    })

    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
}
