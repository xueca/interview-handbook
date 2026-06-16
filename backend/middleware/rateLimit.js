// 文件功能: 无依赖的内存速率限制中间件（防登录/注册暴力尝试） | 数据流: routes → rateLimit → next 或 429
// 按 IP+路径 维度固定时间窗计数；进程级内存存储，重启即清空
const WINDOW_MS = 15 * 60 * 1000 // 时间窗：15分钟
const MAX_ATTEMPTS = 10          // 窗口内最大尝试次数

// key(ip:path) → { count, resetAt }
// 模块级 Map 是服务端进程级共享状态（类似缓存），非组件状态，不属于前端反模式5
const hits = new Map()

// 惰性清理：Map 过大时顺手删掉已过期的 key，避免长期运行内存只增不减
function sweep(now) {
  for (const [k, v] of hits) {
    if (v.resetAt <= now) hits.delete(k)
  }
}

// 限流中间件：同一 IP+路径 在窗口内超过上限则返回 429，并提示剩余等待秒数
function rateLimit(req, res, next) {
  const now = Date.now()
  const key = `${req.ip}:${req.path}`
  let rec = hits.get(key)
  // 首次访问或窗口已过期：重置计数与窗口
  if (!rec || rec.resetAt <= now) {
    rec = { count: 0, resetAt: now + WINDOW_MS }
    hits.set(key, rec)
  }
  rec.count++
  if (rec.count > MAX_ATTEMPTS) {
    const retry = Math.ceil((rec.resetAt - now) / 1000)
    return res.status(429).json({ error: `操作过于频繁，请${retry}秒后重试` })
  }
  if (hits.size > 5000) sweep(now)
  next()
}

module.exports = rateLimit
