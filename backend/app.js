require('dotenv').config()
const express = require('express')
const auth = require('./middleware/auth')
const authRoute = require('./routes/auth')
const questionsRoute = require('./routes/questions')

const app = express()
app.use(express.json())
app.use('/auth',authRoute)
app.use('/questions',questionsRoute)

const port = process.env.PORT 

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})