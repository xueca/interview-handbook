const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const auth = require('../middleware/auth')

//注册不需要登录
router.post('/register',authController.register)
//登录不需要登录
router.post('/login',authController.login)

//获取用户信息需要登录
router.get('/user',auth,authController.getMe)

module.exports = router
