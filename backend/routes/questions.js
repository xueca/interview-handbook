const express = require('express')
const router = express.Router()
const questionController = require('../controllers/questionController')
const auth = require('../middleware/auth')

//获取题目列表
router.get('/',auth,questionController.getList)
//获取题目详情
router.get('/:id',auth,questionController.getDetail)


module.exports = router