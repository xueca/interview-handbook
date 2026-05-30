const { readjson } = require('../data/index')


const questionController = {
    getList:(req,res) => {
    console.log(req.query)
    
    const questions = readjson('questions.json')||[]
    const category = req.query.category || ''
    const difficulty = req.query.difficulty || ''
    const keyword = req.query.keyword || ''
    // 获取 num 参数，默认返回全部
    const num = parseInt(req.query.num) || questions.length
    let filteredQuestions = questions.filter(question => question.category.includes(category) || category === '')
    filteredQuestions = filteredQuestions.filter(question => question.difficulty.includes(difficulty) || difficulty === '')
    filteredQuestions = filteredQuestions.filter(question => question.title.includes(keyword) || keyword === '')
    
    // 如果传了 num，只返回前 num 道题
    if (num && num < filteredQuestions.length) {
        filteredQuestions = filteredQuestions.slice(0, num)
    }
    
    res.json({
        total:filteredQuestions.length,
        msg:'success',
        code:0,
        data:filteredQuestions
    })
},
    getDetail: (req, res) => {
        // 1. 获取路径参数 id
        const queId = parseInt(req.params.id)
        // 2. 读取题目列表
        const questions = readjson('questions.json')||[]
        // 3. 查找匹配的题目
        let question = questions.find(question => question.id === queId)
        // 4. 返回结果或 404
        if(question){
            res.json({
                msg:'success',
                code:0,
                data:question
            })
        }else{
            res.status(404).json({
                msg:'question not found'
            })
        }
        
    },
    collectQuestion: (req, res) => {
        // 读取题目，标记为已收藏（在题目数据中添加 collected: true 字段）
        // 写回文件
        res.json({ code: 0, message: '收藏成功' })
    }
    
}
/**
 * 根据ID获取单题详情
 */
exports.getQuestionById = async (req, res) => {
    const fs = require('fs')
  try {
    const data = fs.readFileSync(questionsPath, 'utf8')
    const questions = JSON.parse(data)
    const question = questions.find(q => q.id === parseInt(req.params.id))
    
    if (!question) {
      return res.status(404).json({ code: -1, message: '题目不存在' })
    }
    
    res.json({ code: 0, data: question, message: 'ok' })
  } catch (error) {
    res.status(500).json({ code: -1, message: '获取题目失败', error: error.message })
  }
}

module.exports = questionController