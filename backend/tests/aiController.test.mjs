// 文件功能: 测试 aiController.generateStream 参数读取与错误兜底 | 数据流: POST /api/ai/generate/stream → generateStream → SSE
import { describe, it } from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import express from 'express'
import { generateStream } from '../controllers/aiController.js'

describe('generateStream', () => {
  // 辅助：构造 express 实例并挂载待测路由
  function buildApp(controller) {
    const app = express()
    app.use(express.json())
    app.post('/api/ai/generate/stream', controller)
    return app
  }

  // 发起 POST 请求，收集 SSE 原始输出
  async function postStream(app, body) {
    return new Promise((resolve, reject) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address()
        const chunks = []
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/ai/generate/stream',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, (res) => {
          res.on('data', (chunk) => chunks.push(chunk.toString()))
          res.on('end', () => {
            server.close()
            resolve({ status: res.statusCode, body: chunks.join('') })
          })
        })
        req.on('error', reject)
        req.write(JSON.stringify(body))
        req.end()
      })
    })
  }

  // 场景：正确从 req.body 读取 category / difficulty / count，DeepSeek 调用失败仍返回 SSE 错误帧
  it('读取 POST body 参数并进入错误兜底', async () => {
    const app = buildApp(generateStream)
    const { status, body } = await postStream(app, { category: 'react', difficulty: 'hard', count: 3 })

    // 未配置 API Key 时进入 catch，以 SSE 格式返回错误并结束
    assert.strictEqual(status, 200)
    assert(body.includes('DeepSeek API Key 未配置'))
    assert(body.includes('data: [DONE]'))
  })

  // 场景：不传 body 时使用默认值，同样能错误兜底
  it('body 为空时使用默认值并进入错误兜底', async () => {
    const app = buildApp(generateStream)
    const { status, body } = await postStream(app, {})

    assert.strictEqual(status, 200)
    assert(body.includes('DeepSeek API Key 未配置'))
    assert(body.includes('data: [DONE]'))
  })
})
