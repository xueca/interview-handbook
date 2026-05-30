const fs = require('fs')
const path = require('path')

// 记录文件路径
const recordsPath = path.join(__dirname, '../data/records.json')

//记录问题路径
const questionsPath = path.join(__dirname, '../data/questions.json')

/**
 * 获取所有记录
 */
exports.getAllRecords = async(req,res) => {
    //判断文件是否存在且内容不为空
    if (!fs.existsSync(recordsPath)) {
      return res.status(404).json({ code: -1, message: '记录文件不存在' })
    }
    try {
    const data = fs.readFileSync(recordsPath, 'utf8')
    const records = data.trim() ? JSON.parse(data) : []
    res.json({ code: 0, data: records })
  } catch (error) {
    res.status(500).json({ code: -1, message: '读取记录失败', error: error.message })
  }
}
/**
 * 创建新记录
 */
exports.createRecord = async (req, res) => {
  try {
    let records = []
    
    // 判断文件是否存在且内容不为空
    if (fs.existsSync(recordsPath)) {
      const data = fs.readFileSync(recordsPath, 'utf8')
      records = data.trim() ? JSON.parse(data) : []
    }
    
    const { questionId, isCorrect } = req.body
    
    // 查找是否已有同一题目的记录
    const existingIndex = records.findIndex(r => r.questionId === questionId)
    
    if (existingIndex !== -1) {
      if (isCorrect) {
        // 答对了：从错题本中移除该记录
        records.splice(existingIndex, 1)
        fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2))
        return res.json({ code: 0, message: '已移除错题记录' })
      } else {
        // 又答错了：更新原有记录（不新增，避免重复）
        records[existingIndex] = {
          ...records[existingIndex],
          ...req.body,
          updatedAt: new Date().toISOString()
        }
        fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2))
        return res.json({ code: 0, message: '错题记录已更新', data: records[existingIndex] })
      }
    }
    
    // 没有旧记录，且是错题 → 新增
    if (!isCorrect) {
      const newRecord = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
      }
      records.push(newRecord)
      fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2))
      return res.json({ code: 0, message: '记录保存成功', data: newRecord })
    }
    
    // 答对了且没有旧记录，无需保存
    res.json({ code: 0, message: '回答正确，无需记录' })
  } catch (error) {
    res.status(500).json({ code: -1, message: '保存记录失败', error: error.message })
  }
}
/**
 * 获取单个记录
 */
//判断文件是否存在
  
exports.getRecordById = async (req, res) => {
    //判断文件是否存在
    if (!fs.existsSync(recordsPath)) {
      return res.status(404).json({ code: -1, message: '记录文件不存在' })
    }
  try {
    const data = fs.readFileSync(recordsPath, 'utf8')
    const records = JSON.parse(data)
    const record = records.find(r => r.id === parseInt(req.params.id))
    
    if (!record) {
      return res.status(404).json({ code: -1, message: '记录不存在' })
    }
    
    res.json({ code: 0, data: record })
  } catch (error) {
    res.status(500).json({ code: -1, message: '读取记录失败', error: error.message })
  }
}
/**
 * 删除记录
 */
exports.deleteRecord = async (req, res) => {
    //判断文件是否存在
    if (!fs.existsSync(recordsPath)) {
      return res.status(404).json({ code: -1, message: '记录文件不存在' })
    }
  try {
    const data = fs.readFileSync(recordsPath, 'utf8')
    let records = JSON.parse(data)
    records = records.filter(r => r.id !== parseInt(req.params.id))
    
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2))
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: -1, message: '删除失败', error: error.message })
  }
}

/**
 * 获取错题本（isCorrect为false的记录，关联题目信息）
 */
exports.getWrongRecords = async( req, res) => {
    try {//1.读取答题记录
    let records = []
    if(fs.existsSync(recordsPath)){
        const data = fs.readFileSync(recordsPath, 'utf8')
        // 如果文件为空，直接使用空数组
        records = data ? JSON.parse(data) : []
    }
    //2.筛选错题
    const wrongRecords = records.filter(r => !r.isCorrect)
    //3.读取题目库
    let questions = []
    if(fs.existsSync(questionsPath)){
       const qdata = fs.readFileSync(questionsPath, 'utf8')
       questions = qdata ? JSON.parse(qdata) : []
    }
    //4.关联题目信息
    const wrongList = wrongRecords.map(record => {
      //根据quesID关联题目信息
      const question = questions.find(q => q.id === record.questionId)
      return {
        //记录信息
        recordId:record.id,            //记录ID
        questionId:record.questionId,  //题目ID
        userAnswer:record.userAnswer,  //用户的错误答案
        duration:record.duration,      //答题时间

        //题目信息
        title:question?.title || '题目已删除',
        options:question?.options  || [],
        answer:question?.answer || '',
        analysis:question?.analysis || '暂无解析',
        category:question?.category || '',
        difficulty: question?.difficulty || ''

      }

    })
   res.json({
      code: 0,
      data: wrongList,
      message: '获取错题本成功',
    })
  } catch (error) {
    res.status(500).json({ code: -1, message: '获取错题本失败', error: error.message })
  }
  
}
/**
 * 标记某条记录为正确（从错题本移除）
 */
exports.markCorrect = async (req, res) => {
  try {
    const recordId = parseInt(req.params.id)
    if (!fs.existsSync(recordsPath)) {
      return res.status(404).json({ code: -1, message: '记录文件不存在' })
    }
    
    const data = fs.readFileSync(recordsPath, 'utf8')
    let records = JSON.parse(data)
    
    // 找到这条记录，把 isCorrect 改成 true
    const index = records.findIndex(r => r.id === recordId)
    if (index === -1) {
      return res.status(404).json({ code: -1, message: '记录不存在' })
    }
    
    records[index].isCorrect = true
    
    // 写回文件
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8')
    
    res.json({ code: 0, message: '已标记为正确' })
  } catch (error) {
    res.status(500).json({ code: -1, message: '操作失败', error: error.message })
  }
}