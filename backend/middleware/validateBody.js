// 中间件: 校验 POST 请求体必须为对象 | 数据流: routes → validateBody → controller
// 当 req.body 不是对象时返回清晰的 400 错误（含 receivedType），避免模糊的 JSON parse error

/**
 * 校验请求体包含必填字段
 * @param {...string} requiredFields - 必填字段名列表
 * @returns {Function} Express 中间件
 */
function validateBody(...requiredFields) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      console.error('[validateBody] 非法请求体:', JSON.stringify(req.body).slice(0, 200))
      return res.status(400).json({
        code: -1,
        message: '请求体必须是 JSON 对象',
        receivedType: typeof req.body,
        receivedPreview: JSON.stringify(req.body).slice(0, 100)
      })
    }
    for (const field of requiredFields) {
      if (req.body[field] === undefined) {
        return res.status(400).json({
          code: -1,
          message: '缺少必填字段: ' + field
        })
      }
    }
    next()
  }
}

module.exports = validateBody
