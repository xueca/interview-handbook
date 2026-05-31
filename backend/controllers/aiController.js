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
      timeout: stream ? 30000 : 10000,  // 流式给 30 秒首包时间
      responseType: stream ? 'stream' : 'json'
    }
  )

  return response
}
// 2. 非流式接口：exports.generate = async (req, res) => {}
  exports.generate = async (req,res) => {
    try{
      // 1. 接收参数
      const { category = 'vue', difficulty= 'medium',count= 1} = req.body
      // 2. 构造 Prompt
      const systemPrompt = '你是一个专业的前端面试出题专家。请严格按照要求的格式输出题目 JSON。'

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
      ]`

      // 3. 调 DeepSeek
      const response = await callDeepSeek({ prompt, systemPrompt, stream: false })
      // 4. 解析返回
      // 4.1 从 response 中取出 AI 返回的文本字符串
      const content = response.data.choices[0].message.content
      // 4.2 把这个字符串解析成 JavaScript 对象（题目数组）
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```')) {
        // 去掉第一行（```json 或 ```）
        cleanContent = cleanContent.slice(cleanContent.indexOf('\n') + 1)
        // 去掉最后一行（```）
        const lastIndex = cleanContent.lastIndexOf('```')
        if (lastIndex !== -1) {
          cleanContent = cleanContent.slice(0, lastIndex).trim()
        }
      }
      // 4.3 解析成 JavaScript 对象
      const questions = JSON.parse(cleanContent)
      // 5. 返回给前端
      res.json({
        code: 0,
        message:'生成成功',
        data: questions

      })
    }catch(error){
      //错误处理
      res.status(500).json({
        code: 500,
        message: '生成失败',
        data: null
      })
    }
  }
// 3. 流式接口：exports.generateStream = async (req, res) => {}
  exports.generateStream = async (req,res) => {
    try{
    // 1. 接收参数
    const { category = 'vue', difficulty = 'medium', count = 1 } = req.query
    // 2. 构造 Prompt
    const systemPrompt = '你是一个专业的前端面试出题专家。请严格按照要求的格式输出题目 JSON。'
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
]`
    // 3. 调 DeepSeek（流式）
    const response = await callDeepSeek({ prompt, systemPrompt, stream: true })
    // 4. SSE 转发
    //   4a. 设置 SSE 响应头
    res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
     })
    //   4b. 监听 DeepSeek 流数据
response.data.on('data', (chunk) => {
  // chunk 是一个 Buffer，转成字符串
  const lines = chunk.toString().split('\n')
  
  for (const line of lines) {
    // SSE 格式：每行以 "data: " 开头
    if (line.startsWith('data: ')) {
      const data = line.slice(6) // 去掉 "data: " 前缀
      
      // 判断是否是结束信号
      if (data === '[DONE]') {
        // 4e. 流结束
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
      
      // 4c. 解析 chunk
      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices[0].delta.content || ''
if (content) {
  res.write(`data: ${JSON.stringify({ text: content })}\n\n`)
}
        // 4d. res.write() 推给前端
      } catch (e) {
        // 跳过解析失败的行
      }
    }
  }
})
// 流正常结束的兜底 
response.data.on('end', () => {
  res.write('data: [DONE]\n\n')
  res.end()
})
// 流出错的兜底
response.data.on('error', (err) => {
  res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  res.write('data: [DONE]\n\n')
  res.end()
})
    } catch (error) {
      // SSE 错误处理
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
    }
    }
  