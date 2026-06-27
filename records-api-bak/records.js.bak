import request from './request'

export function submitRecord(data) {
  return request.post('/records', data)
}

export function getRecords(params) {
  return request.get('/records', { params })
}

export function getStats() {
  return request.get('/records/stats')
}

export function getWrong() {
  return request.get('/records/wrong')
}

export function toggleMark(data) {
  return request.post('/records/mark', data)
}

export function getMarks() {
  return request.get('/records/marks')
}
