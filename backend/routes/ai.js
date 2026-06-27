// /api/ai → generate / generateStream / chat / chatStream
const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const validateBody = require('../middleware/validateBody')
const { generate, generateStream } = require('../controllers/aiController')
const { chat, chatStream } = require('../controllers/chatController')

router.post('/generate', auth, generate)
router.post('/generate/stream', auth, validateBody('category', 'difficulty'), generateStream)
router.post('/chat', auth, chat)
router.post('/chat/stream', auth, chatStream)

module.exports = router
