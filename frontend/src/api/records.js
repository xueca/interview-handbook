import request from './request'

/**
 * 提交答题记录
 * @param {object} data - 答题记录数据
 * @returns {Promise}
 */
export function submitRecord(data) {
  return request.post('/records', data)
}

/**
 * 获取所有记录
 * @returns {Promise}
 */
export function getRecords() {
  return request.get('/records')
}

/**
 * 获取单个记录
 * @param {number} id - 记录ID
 * @returns {Promise}
 */
export function getRecord(id) {
  return request.get(`/records/${id}`)
}

/**
 * 删除记录
 * @param {number} id - 记录ID
 * @returns {Promise}
 */
export function deleteRecord(id) {
  return request.delete(`/records/${id}`)
}

/**
 * 获取错题本
 * @returns {Promise}
 */
export function getWrongRecords() {
  return request.get('/records/wrong')
}
/**
 * 标记某条记录为正确（从错题本移除）
 * @param {number} id 
 * @returns {Promise}
 */
export function markCorrect(id) {
  return request.put(`/records/${id}/correct`)
}


