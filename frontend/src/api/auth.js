import request from './request'

export function register(username,password){
    // 调用 request.post()，第一个参数是接口路径，第二个是请求体
  // 接口路径是 '/auth/register'（因为 request.js 已经配了 baseURL: '/api'）
  // 请求体是 { username, password }
  return request.post('/auth/register',{username,password})
}

export  function login(username,password){
    //调用 POST /auth/login
    return request.post('/auth/login',{username,password})
}
export  function getMe(){
    // 调用 GET /auth/user
    return request.get('/auth/user')
}