const express = require('express')
const router = express.Router()
const aiController = require('../controllers/aiController')


router.post('/generate', aiController.generate)
//router.post('/evaluate', aiController.evaluate)
router.get('/generate/stream', aiController.generateStream)













module.exports = router;