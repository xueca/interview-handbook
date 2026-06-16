// 文件功能: 前端注册/改名/改密输入校验（与后端规则一致，提供即时反馈） | 数据流: Login/useProfile → validateXxx → 提示文案
// 后端为权威校验，此处仅为提升体验提前拦截，规则需与 backend/utils/validator.js 保持同步

// 校验用户名：3-20位字母/数字/下划线/中文，合法返回 null
export function validateUsername(username) {
  if (!username) return '用户名不能为空'
  if (!/^[\w一-龥]{3,20}$/.test(username)) return '用户名需为3-20位字母、数字、下划线或中文'
  return null
}

// 校验密码：6-32位且同时含字母和数字，合法返回 null
export function validatePassword(password) {
  if (!password) return '密码不能为空'
  if (password.length < 6 || password.length > 32) return '密码长度需为6-32位'
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return '密码需同时包含字母和数字'
  return null
}
