const { Router } = require('express')
const { getList, getDetail } = require('../controllers/questionController')
const auth = require('../middleware/auth')

const router = Router()

router.get('/', auth, getList)
router.get('/:id', auth, getDetail)

module.exports = router
