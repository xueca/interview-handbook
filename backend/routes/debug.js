// 文件功能: 调试 echo 端点 POST /api/debug/echo-body | 数据流: 浏览器 → Nginx → 后端 → 打印并返回请求体
// 用途: 诊断前端 POST 请求体内容（typeof / keys / raw），帮助定位 body-parser 400
const express = require('express')
const router = express.Router()

router.post('/echo-body', (req, res) => {
  const rawBody = JSON.stringify(req.body)
  const bodyType = typeof req.body
  const bodyKeys = bodyType === 'object' && !Array.isArray(req.body) ? Object.keys(req.body) : null
  const contentType = req.headers['content-type']
  const contentLength = req.headers['content-length']

  console.log('===== DEBUG ECHO =====')
  console.log('[headers] content-type:', contentType)
  console.log('[headers] content-length:', contentLength)
  console.log('[body] typeof:', bodyType)
  console.log('[body] isArray:', Array.isArray(req.body))
  console.log('[body] keys:', bodyKeys)
  console.log('[body] raw:', rawBody.slice(0, 500))
  console.log('=======================')

  res.json({
    code: 0,
    message: 'echo',
    data: {
      body: req.body,
      bodyType,
      bodyKeys,
      contentType,
      contentLength
    }
  })
})

module.exports = router
