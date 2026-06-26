import request from './request'

export function register(username, password) {
  return request.post('/auth/register', { username, password })
}

export function login(username, password) {
  return request.post('/auth/login', { username, password })
}

export function getMe() {
  return request.get('/auth/me')
}

// 修改密码：已登录用户直接重置，无需旧密码
export function changePassword(newPassword) {
  return request.put('/auth/password', { newPassword })
}

// 修改用户名：返回 { token, user }，调用方需用新 token 刷新登录态
export function updateUsername(username) {
  return request.put('/auth/username', { username })
}
