const { readjson } = require('../data/index')


const questionController = {
    getList:(req,res) => {
    // 先用 console.log 看看 req.query 里有什么
    console.log(req.query)
    
    // 1. 读取所有题目
    const questions = readjson('questions.json')||[]
    // 2. 按条件筛选
    const category = req.query.category || ''
    const difficulty = req.query.difficulty || ''
    const keyword = req.query.keyword || ''
    let filteredQuestions = questions.filter(question => question.category.includes(category) || category === '')
    filteredQuestions = filteredQuestions.filter(question => question.difficulty.includes(difficulty) || difficulty === '')
    filteredQuestions = filteredQuestions.filter(question => question.title.includes(keyword) || keyword === '')
    //3.返回结果
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
        
            } 
}


module.exports = questionController