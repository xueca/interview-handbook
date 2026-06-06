const { Router } = require('express')
const { submit, getRecords, getStats, getWrong, toggleMark, getMarks } = require('../controllers/recordController')
const auth = require('../middleware/auth')

const router = Router()

router.post('/', auth, submit)
router.get('/', auth, getRecords)
router.get('/stats', auth, getStats)
router.get('/wrong', auth, getWrong)
router.post('/mark', auth, toggleMark)
router.get('/marks', auth, getMarks)

module.exports = router
