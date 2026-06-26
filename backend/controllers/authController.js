const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { readJSON, writeJSON } = require('../data')
const { validateUsername, validatePassword } = require('../utils/validator')

const JWT_SECRET = process.env.JWT_SECRET || 'interview-handbook-jwt-secret-2026'

const USERS_FILE = 'users.json'
const SALT_ROUNDS = 10

// 时间戳 + 随机后缀，避免同毫秒并发注册生成相同 id
function generateId() {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

async function register(req, res) {
  try {
    const { username, password } = req.body

    // 注册强校验：用户名格式 + 密码强度（登录不做此校验，避免锁死旧账号）
    const vErr = validateUsername(username) || validatePassword(password)
    if (vErr) return res.status(400).json({ error: vErr })

    const users = readJSON(USERS_FILE)
    const exists = users.find(u => u.username === username)
    if (exists) {
      return res.status(409).json({ error: '用户名已存在' })
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const newUser = {
      id: generateId(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    }

    users.push(newUser)
    writeJSON(USERS_FILE, users)

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: newUser.id, username: newUser.username }
    })
  } catch (e) {
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    const users = readJSON(USERS_FILE)
    const user = users.find(u => u.username === username)
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: '登录成功',
      token,
      user: { id: user.id, username: user.username }
    })
  } catch (e) {
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
}

// 返回当前登录用户资料：JWT 里只有 id/username，注册时间需回查 users.json 补全
function getMe(req, res) {
  const users = readJSON(USERS_FILE)
  const user = users.find(u => u.id === req.user.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  res.json({ user: { id: user.id, username: user.username, createdAt: user.createdAt } })
}

// 修改密码：已登录用户(JWT 已验明身份)直接重置，不校验旧密码——避免用户忘记旧密码无法修改
// 同样走密码强度校验，防止借改密绕过注册规则设置弱密码
async function changePassword(req, res) {
  try {
    const { newPassword } = req.body
    const vErr = validatePassword(newPassword)
    if (vErr) return res.status(400).json({ error: vErr })
    const users = readJSON(USERS_FILE)
    const user = users.find(u => u.id === req.user.id)
    if (!user) return res.status(404).json({ error: '用户不存在' })

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS)
    writeJSON(USERS_FILE, users)
    res.json({ message: '密码修改成功' })
  } catch (e) {
    res.status(500).json({ error: '密码修改失败，请稍后重试' })
  }
}

// 修改用户名：重名校验(排除自己)后落盘，并重新签发携带新用户名的 token
// 重签是为了让侧边栏显示与后续请求里的用户名跟库内保持一致
function updateUsername(req, res) {
  try {
    const { username } = req.body
    const vErr = validateUsername(username)
    if (vErr) return res.status(400).json({ error: vErr })
    const users = readJSON(USERS_FILE)
    if (users.find(u => u.username === username && u.id !== req.user.id)) {
      return res.status(409).json({ error: '用户名已存在' })
    }
    const user = users.find(u => u.id === req.user.id)
    if (!user) return res.status(404).json({ error: '用户不存在' })
    user.username = username
    writeJSON(USERS_FILE, users)
    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ message: '用户名修改成功', token, user: { id: user.id, username } })
  } catch (e) {
    res.status(500).json({ error: '用户名修改失败，请稍后重试' })
  }
}

module.exports = { register, login, getMe, changePassword, updateUsername }
