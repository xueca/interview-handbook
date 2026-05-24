const jwt = require('jsonwebtoken');
const {readjson} = require('../data/index.js')
 
function auth(req, res, next) {
   const authheader = req.headers.authorization;
   if(!authheader || !authheader.startsWith('Bearer ')){
      return res.status(401).json({
        code: 401, message:"未登录",data:null 
      })
   }
   const token = authheader.split(' ')[1];
   try{
    const decoded = jwt.verify(token,process.env.JWT_SECRET)
    console.log('JWT 验证成功:', decoded)
    console.log('Token 过期时间:', new Date(decoded.exp * 1000).toISOString())
  req.user =decoded    
  next()
}catch(err){
  console.log('JWT 验证错误:', err.name, err.message)
  console.log('当前服务器时间:', new Date().toISOString())
  const message = err.name === 'TokenExpiredError' ? '登录过期' : 'Token无效'
  return res.status(401).json({
    code: 401, message: message, data:null
  })
}
}
module.exports = auth
