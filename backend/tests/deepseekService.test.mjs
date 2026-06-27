// 文件功能: 测试 deepseekService.relaySSE 的 SSE 输出行为 | 数据流: 模拟上游流 → relaySSE → Express res
import { describe, it } from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import { Readable } from 'node:stream'
import express from 'express'
import { initSSE, relaySSE } from '../services/deepseekService.js'

// 创建模拟的 axios 流式响应对象：data 字段是可读流
function createMockUpstream(streamData) {
  const stream = Readable.from(streamData)
  return { data: stream }
}

// 发送 HTTP 请求到本地 express 端点，返回收集到的所有 SSE 数据行
async function collectSSE(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      const chunks = []
      const req = http.get(`http://127.0.0.1:${port}/stream`, (res) => {
        res.on('data', (chunk) => chunks.push(chunk.toString()))
        res.on('end', () => {
          server.close()
          resolve(chunks.join(''))
        })
      })
      req.on('error', reject)
    })
  })
}

describe('relaySSE', () => {
  // 场景1：正常流，AI 返回完整 JSON 题目
  it('正常流：转发完整 JSON 题目', async () => {
    const app = express()
    app.get('/stream', (req, res) => {
      initSSE(res)
      const upstream = createMockUpstream([
        'data: {"choices":[{"delta":{"content":"{\\"title\\":\\"T\\",\\"options\\":[\\"A\\",\\"B\\",\\"C\\",\\"D\\"]"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":",\\"answer\\":0}"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
      relaySSE(upstream, res)
    })

    const raw = await collectSSE(app)
    const lines = raw.split('\n').filter(Boolean)

    // 期望：连接确认 + 2 段 content + [DONE]
    assert(lines.some(line => line === ':connected'))
    assert(lines.some(line => line.includes('"content":"{\\"title\\":\\"T\\"')))
    assert(lines.some(line => line === 'data: [DONE]'))
  })

  // 场景2：上游流 30 秒无响应，触发 axios 超时
  it('超时：上游无数据时 relaySSE 不崩溃', async () => {
    const app = express()
    app.get('/stream', (req, res) => {
      initSSE(res)
      // 模拟一个永远不结束的流
      const neverEnd = new Readable({ read() {} })
      const upstream = { data: neverEnd }
      relaySSE(upstream, res)
      // 模拟 30s 后上游 error（axios timeout 会触发）
      setTimeout(() => {
        neverEnd.destroy(new Error('timeout of 30000ms exceeded'))
      }, 50)
    })

    const raw = await collectSSE(app)
    assert(raw.includes('"error":"timeout of 30000ms exceeded"'))
    assert(raw.includes('data: [DONE]'))
  })

  // 场景3：AI 返回非 JSON 格式，relaySSE 跳过解析失败的行
  it('解析失败：非 JSON 格式被跳过，最终仍发送 [DONE]', async () => {
    const app = express()
    app.get('/stream', (req, res) => {
      initSSE(res)
      const upstream = createMockUpstream([
        'data: 这不是 JSON\n\n',
        'data: {broken json}\n\n',
        'data: [DONE]\n\n'
      ])
      relaySSE(upstream, res)
    })

    const raw = await collectSSE(app)
    // 非法行不应产生 content/reasoning 数据帧，但应正常结束
    assert(!raw.includes('"content"'))
    assert(!raw.includes('"reasoning"'))
    assert(raw.includes('data: [DONE]'))
  })
})
