const { Router } = require('express')
const { getList, getDetail, createQuestion, removeQuestion } = require('../controllers/questionController')
const auth = require('../middleware/auth')

const router = Router()

router.get('/', auth, getList)
router.get('/:id', auth, getDetail)
router.post('/', auth, createQuestion)
router.delete('/:id', auth, removeQuestion)  // 删题 + 级联清理 marks

module.exports = router
