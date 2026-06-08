const https = require('https')
const { SYSTEM_PROMPTS } = require('./aiPrompt')
const { repairJSON, parseStreamChunk } = require('./aiParser')

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_MODEL = 'deepseek-chat'

function buildRequestBody(prompt, systemKey, stream) {
  return JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS[systemKey] },
      { role: 'user', content: prompt }
    ],
    stream
  })
}

function callDeepSeek(prompt, systemKey = 'chat', stream = false) {
  return new Promise((resolve, reject) => {
    const body = buildRequestBody(prompt, systemKey, stream)
    let data = ''
    const req = https.request({
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) return reject(new Error(json.error.message))
          resolve(json.choices[0].message.content)
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function generate(req, res) {
  const { topic } = req.body
  if (!topic) return res.status(400).json({ error: '缺少主题' })
  try {
    const result = await callDeepSeek(topic, 'generate', false)
    const question = repairJSON(result)
    res.json({ question })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

async function chat(req, res) {
  const { message } = req.body
  if (!message) return res.status(400).json({ error: '缺少消息' })
  try {
    const reply = await callDeepSeek(message, 'chat', false)
    res.json({ reply })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

const MAX_OUTPUT_CHARS = 16000

function parseEvents(buffer) {
  const events = buffer.split('\n\n')
  const remaining = events.pop() || ''
  let content = ''
  for (const event of events) {
    const c = parseStreamChunk(event)
    if (c) content += c
  }
  return { content: content || null, remaining }
}

function handleStreamResponse(apiRes, res) {
  let buffer = ''
  let accumulated = 0
  let hasStarted = false
  apiRes.on('data', chunk => {
    if (!hasStarted) {
      hasStarted = true
      res.write(`data: ${JSON.stringify({ type: 'status', status: 'thinking' })}\n\n`)
    }
    buffer += chunk.toString()
    const result = parseEvents(buffer)
    if (result.content) {
      accumulated += result.content.length
      if (accumulated > MAX_OUTPUT_CHARS) {
        apiRes.destroy()
        res.write(`data: ${JSON.stringify({ type: 'status', status: 'truncated' })}\n\n`)
        res.end()
        return
      }
      res.write(`data: ${JSON.stringify({ type: 'content', content: result.content })}\n\n`)
    }
    buffer = result.remaining
  })
  apiRes.on('end', () => {
    res.write(`data: ${JSON.stringify({ type: 'status', status: 'done' })}\n\n`)
    res.end()
  })
}

function streamDeepSeek(prompt, systemKey, res) {
  const body = buildRequestBody(prompt, systemKey, true)
  const req = https.request({
    hostname: 'api.deepseek.com',
    port: 443,
    path: '/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Length': Buffer.byteLength(body)
    }
  }, (apiRes) => handleStreamResponse(apiRes, res))
  req.on('error', (e) => {
    res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`)
    res.end()
  })
  req.write(body)
  req.end()
}

function generateStream(req, res) {
  const { topic } = req.body
  if (!topic) return res.status(400).json({ error: '缺少主题' })
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  streamDeepSeek(topic, 'generate', res)
}

function chatStream(req, res) {
  const { message } = req.body
  if (!message) return res.status(400).json({ error: '缺少消息' })
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  streamDeepSeek(message, 'chat', res)
}

module.exports = { generate, chat, generateStream, chatStream }
