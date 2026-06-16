// 文件功能: 注册/改名/改密的输入校验（服务端权威校验） | 数据流: 各 controller → validateXxx → 错误文案或 null
// 用户名: 3-20 位，字母/数字/下划线/中文，不含空格与特殊符号
const USERNAME_RE = /^[\w一-龥]{3,20}$/
// 密码: 6-32 位
const PASSWORD_MIN = 6
const PASSWORD_MAX = 32

// 校验用户名，合法返回 null，否则返回中文错误文案
function validateUsername(username) {
  if (!username) return '用户名不能为空'
  if (!USERNAME_RE.test(username)) return '用户名需为3-20位字母、数字、下划线或中文'
  return null
}

// 校验密码强度（长度 + 必须同时含字母和数字），合法返回 null
function validatePassword(password) {
  if (!password) return '密码不能为空'
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `密码长度需为${PASSWORD_MIN}-${PASSWORD_MAX}位`
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return '密码需同时包含字母和数字'
  }
  return null
}

module.exports = { validateUsername, validatePassword }
