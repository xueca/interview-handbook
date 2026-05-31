require('dotenv').config()
const express = require('express')
const auth = require('./middleware/auth')
const authRoute = require('./routes/auth')
const questionsRoute = require('./routes/questions')
const recordsRoutes = require('./routes/records')
const aiRoutes = require('./routes/ai')


const app = express()
const cors = require('cors')
app.use(cors())
app.use(express.json())

app.use('/auth', authRoute)
app.use('/questions', auth,questionsRoute)
app.use('/records', auth,recordsRoutes)
app.use('/ai', auth,aiRoutes)
const port = process.env.PORT 

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})