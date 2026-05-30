import request from './request'


export function getList(params){
    return request.get('/questions',{params})

}
/**
 * 获取题目详情
 * @param {number} id - 题目ID
 * @returns {Promise}
 */
export function getDetail(id){
    return request.get(`/questions/${id}`)
    
}

export function collectQuestionApi(id){
    return request.post(`/questions/${id}/collect`)
}