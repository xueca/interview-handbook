const { Router } = require('express')
const authController = require('../controllers/authController')
const auth = require('../middleware/auth')
const rateLimit = require('../middleware/rateLimit')

const router = Router()

// 注册/登录是暴力尝试的主要入口，挂限流中间件
router.post('/register', rateLimit, authController.register)
router.post('/login', rateLimit, authController.login)
router.get('/me', auth, authController.getMe)
router.put('/password', auth, authController.changePassword)
router.put('/username', auth, authController.updateUsername)

module.exports = router
