// AI接口: POST /ai/generate(非流式出题) POST /ai/generate/stream(流式出题) POST /ai/chat(非流式对话) POST /ai/chat/stream(流式对话)
import request from './request'
import { createSSE } from './sse'

// 非流式出题
export function generate(params) {
  return request.post('/ai/generate', params)
}

// 流式出题：SSE方式，返回abort函数
export function generateStream(params, onMessage, onError) {
  return createSSE('/api/ai/generate/stream', params, onMessage, onError)
}

// 非流式对话
export function chat(question) {
  return request.post('/ai/chat', { question })
}

// 流式对话：SSE方式，返回abort函数
export function chatStream(question, onMessage, onError) {
  return createSSE('/api/ai/chat/stream', { question }, onMessage, onError)
}
