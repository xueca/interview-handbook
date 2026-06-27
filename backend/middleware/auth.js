// 文件功能: JWT 认证中间件 | 数据流: req.headers.authorization → jwt.verify → req.user
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  // 生产环境必须显式设置 JWT_SECRET，禁止默认 fallback
  console.error('FATAL: JWT_SECRET is not set')
  process.exit(1)
}

// 验证 Bearer Token，将解码后的用户信息挂载到 req.user
function auth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: '令牌无效或已过期' })
  }
}

module.exports = auth