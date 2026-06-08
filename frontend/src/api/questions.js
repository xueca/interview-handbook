import request from './request'

export function getList(params) {
  return request.get('/questions', { params })
}

export function getDetail(id) {
  return request.get(`/questions/${id}`)
}

export function createQuestion(data) {
  return request.post('/questions', data)
}

// 删除题目: DELETE /questions/:id — 后端同时级联清理 marks
export function removeQuestion(id) {
  return request.delete(`/questions/${id}`)
}
