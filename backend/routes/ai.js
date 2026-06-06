const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { generate, chat, generateStream, chatStream } = require('../controllers/aiController')

router.post('/generate', auth, generate)
router.post('/generate/stream', auth, generateStream)
router.post('/chat', auth, chat)
router.post('/chat/stream', auth, chatStream)

module.exports = router
