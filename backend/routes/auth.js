const { Router } = require('express')
const authController = require('../controllers/authController')
const auth = require('../middleware/auth')

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/me', auth, authController.getMe)

module.exports = router
