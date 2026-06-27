// 文件功能: 在 express.json() 之前捕获原始请求 body | 数据流: Nginx → captureRawBody → express.json → route
// 用途: JSON parse 失败时记录原始 body 内容，辅助诊断 400 Bad Request 根因

/**
 * 捕获 POST 请求的原始 body 字符串，挂载到 req._rawBody
 * 必须在 express.json() 之前注册
 * @note 仅处理 POST 请求，非 POST 直接跳过
 * @sideEffect 修改 req._rawBody
 */
function captureRawBody(req, res, next) {
  if (req.method !== 'POST') return next()

  let data = ''
  req.on('data', chunk => { data += chunk })
  req.on('end', () => {
    req._rawBody = data
    next()
  })
}

module.exports = captureRawBody
