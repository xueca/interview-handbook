const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { readJSON, writeJSON } = require('../data')

const JWT_SECRET = process.env.JWT_SECRET || 'interview-handbook-jwt-secret-2026'

const USERS_FILE = 'users.json'
const SALT_ROUNDS = 10

function generateId() {
  return 'user_' + Date.now().toString(36)
}

async function register(req, res) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

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

function getMe(req, res) {
  res.json({ user: req.user })
}

module.exports = { register, login, getMe }
