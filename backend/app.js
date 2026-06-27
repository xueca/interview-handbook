// 文件功能: Express主入口，加载中间件/路由 | 数据流: 中间件链 → routes → controllers
const envPath = __dirname + '/' + (process.env.NODE_ENV === 'production' ? '.env.production.active' : '.env')
require('dotenv').config({ path: envPath })
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const recordRoutes = require('./routes/records');
const aiRoutes = require('./routes/ai');
const captureRawBody = require('./middleware/captureRawBody');

const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
// ★ 在 body-parser 之前捕获原始 body，JSON parse 失败时记录原始内容以辅助诊断
app.use(captureRawBody);

// 自定义 JSON body parser（替代 express.json()）
// 对 POST/PUT + application/json 请求使用JSON.parse()，若失败则记录原始body并返回清晰错误
app.use((req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'PUT') return next()
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) return next()

  const rawBody = req._rawBody || ''
  try {
    req.body = JSON.parse(rawBody)
    next()
  } catch (e) {
    console.error('[bodyParser] JSON parse 错误:', e.message)
    console.error('[bodyParser] 原始 body (前200字符):', rawBody.slice(0, 200))
    console.error('[bodyParser] 原始 body 类型:', typeof rawBody)
    console.error('[bodyParser] content-type:', req.headers['content-type'])
    return res.status(400).json({
      code: -1,
      message: '请求体不是有效的 JSON',
      detail: e.message,
      rawBodyPreview: rawBody.slice(0, 200)
    })
  }
})

// 调试端点（仅诊断用）
app.use('/api/debug', require('./routes/debug'))

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
