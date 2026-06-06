import request from './request'
import { createSSE } from './sse'

export function generate(topic) {
  return request.post('/ai/generate', { topic })
}

export function chat(message) {
  return request.post('/ai/chat', { message })
}

export function generateStream(topic, onMessage, onError) {
  return createSSE('/api/ai/generate/stream', { topic }, onMessage, onError)
}

export function chatStream(message, onMessage, onError) {
  return createSSE('/api/ai/chat/stream', { message }, onMessage, onError)
}
