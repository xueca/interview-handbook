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
* 创建新记录（保存逐题记录，不管对错都保留最新结果）
*/
exports.createRecord = async (req, res) => {
  try {
    let records = []
    if (fs.existsSync(recordsPath)) {
      const data = fs.readFileSync(recordsPath, 'utf8')
      records = data.trim() ? JSON.parse(data) : []
    }

    const { questionId, isCorrect } = req.body
    // 兼容旧数据：只处理有 questionId 的逐题记录，跳过套卷格式
    const existingIndex = records.findIndex(r => r && r.questionId === questionId)

    if (existingIndex !== -1) {
      // 已有这道题的记录，更新为最新结果
      records[existingIndex] = {
        ...records[existingIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      }
    } else {
      // 新题，追加记录
      const newRecord = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
      }
      records.push(newRecord)
    }
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2))
    res.json({ code: 0, message: '记录保存成功' })
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
/**
 * 获取学习统计（总正确率、分类统计、难度统计、每日趋势）
 */
exports.getStats = async (req, res) => {
  try {
    // 1. 读取记录和题目数据
    let records = []
    let questions = []
    if (fs.existsSync(recordsPath)) {
      const data = fs.readFileSync(recordsPath, 'utf8')
      records = data.trim() ? JSON.parse(data) : []
    }
    if (fs.existsSync(questionsPath)) {
      const qdata = fs.readFileSync(questionsPath, 'utf8')
      questions = qdata.trim() ? JSON.parse(qdata) : []
    }

    // 2. 构建题目信息映射 { questionId: { category, difficulty } }
    const questionMap = {}
    questions.forEach(q => {
      questionMap[q.id] = {
        category: q.category || '',
        difficulty: q.difficulty || ''
      }
    })

    // 3. 统计结果容器
    const result = {
      totalQuestions: 0,
      correctCount: 0,
      accuracy: 0,
      categoryStats: [],
      difficultyStats: [],
      dailyTrend: []
    }

    // 4. 计算总正确率
    result.totalQuestions = records.length
    result.correctCount = records.filter(r => r.isCorrect).length
    result.accuracy = result.totalQuestions > 0
      ? Math.round((result.correctCount / result.totalQuestions) * 100)
      : 0

    // 5. 按分类统计
    const categoryMap = {}
    records.forEach(r => {
      const cat = r.category || '未分类'
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, correct: 0 }
      }
      categoryMap[cat].total++
      if (r.isCorrect) categoryMap[cat].correct++
    })
    result.categoryStats = Object.entries(categoryMap).map(([category, stat]) => ({
      category,
      total: stat.total,
      correct: stat.correct,
      accuracy: Math.round((stat.correct / stat.total) * 100)
    }))
    // 6. 按难度统计
    const difficultyMap = {}
    records.forEach(r => {
      const qInfo = questionMap[r.questionId]
      const diff = qInfo?.difficulty || '未知'
      if (!difficultyMap[diff]) {
        difficultyMap[diff] = { total: 0, correct: 0 }
      }
      difficultyMap[diff].total++
      if (r.isCorrect) difficultyMap[diff].correct++
    })
    result.difficultyStats = Object.entries(difficultyMap).map(([difficulty, stat]) => ({
      difficulty,
      total: stat.total,
      correct: stat.correct,
      accuracy: Math.round((stat.correct / stat.total) * 100)
    }))
    // 7. 按日期统计趋势
    const dateMap = {}
    records.forEach(r => {
      if (!r.createdAt) return
      const date = r.createdAt.slice(0, 10)
      if (!dateMap[date]) {
        dateMap[date] = { total: 0, correct: 0 }
      }
      dateMap[date].total++
      if (r.isCorrect) dateMap[date].correct++
    })

    result.dailyTrend = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stat]) => ({
        date,
        total: stat.total,
        correct: stat.correct,
        accuracy: Math.round((stat.correct / stat.total) * 100)
      }))

    res.json({ code: 0, data: result })
  } catch (error) {
    res.status(500).json({ code: -1, message: '统计失败', error: error.message })
  }
}