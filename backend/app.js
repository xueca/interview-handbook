// 生产环境使用 .env.production.active，开发环境使用 .env
const envPath = __dirname + '/' + (process.env.NODE_ENV === 'production' ? '.env.production.active' : '.env')
require('dotenv').config({ path: envPath })
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const recordRoutes = require('./routes/records');
const aiRoutes = require('./routes/ai');

const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
