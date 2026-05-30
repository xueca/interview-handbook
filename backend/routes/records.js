const express = require('express')
const router = express.Router()
const recordController = require('../controllers/recordController')

// 获取所有记录
router.get('/', recordController.getAllRecords)

// 创建新记录
router.post('/', recordController.createRecord)

// 获取错题本
router.get('/wrong', recordController.getWrongRecords)

// 获取单个记录
router.get('/:id', recordController.getRecordById)
//标记某条记录为正确（从错题本移除）
router.put('/:id/correct', recordController.markCorrect)

// 删除记录
router.delete('/:id', recordController.deleteRecord)


module.exports = router