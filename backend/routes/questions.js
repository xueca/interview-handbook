const express = require('express')
const router = express.Router()
const questionController = require('../controllers/questionController')
const auth = require('../middleware/auth')

//获取题目列表
router.get('/',auth,questionController.getList)
//获取题目详情
router.get('/:id',auth,questionController.getDetail)

router.post('/:id/collect', auth, questionController.collectQuestion)


module.exports = router