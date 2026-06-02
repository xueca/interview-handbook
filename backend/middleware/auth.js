const jwt = require('jsonwebtoken');
const {readjson} = require('../data/index.js')
 
function auth(req, res, next) {
  // 兼容两种传 token 的方式：
   // 1. 普通请求：Authorization: Bearer xxx（从 header 取）
   // 2. SSE 请求：?token=xxx（从 query 取，因为 EventSource 不能自定义 header）
   const authHeader = req.headers.authorization
   const queryToken = req.query.token
   
   let token
   if (authHeader && authHeader.startsWith('Bearer ')) {
     token = authHeader.split(' ')[1]
   } else if (queryToken) {
     token = queryToken
   } else {
     return res.status(401).json({ code: 401, message: '未登录', data: null })
   }
   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET)
     req.user = decoded
     next()
}catch(err){
  console.log('JWT 验证错误:', err.name, err.message)
  console.log('当前服务器时间:', new Date().toISOString())
  const message = err.name === 'TokenExpiredError' ? '登录过期' : 'Token无效'
  const isSSE = req.path.includes('/stream')
  if(isSSE){
    res.writeHead(401,{
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    })
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    res.write('data: [DONE]\n\n')
    return res.end()
  }
  return res.status(401).json({
    code: 401, message: message, data:null
  })
  }
}

module.exports = auth
