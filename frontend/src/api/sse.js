// SSE 流式请求封装 | 数据流: createSSE → fetch → ReadableStream → onMessage/onError

function processBuffer(buffer, onMessage) {
  const lines = buffer.split('\n\n')
  const remaining = lines.pop() || ''
  lines.forEach(line => {
    if (line.startsWith('data: ')) {
      const payload = line.slice(6)
      // 处理后端发送的 [DONE] 标记（非JSON字符串，不能直接 JSON.parse）
      if (payload === '[DONE]') {
        onMessage({ type: 'status', status: 'done' })
        return
      }
      try {
        const data = JSON.parse(payload)
        onMessage(data)
      } catch { /* ignore parse error */ }
    }
  })
  return remaining
}

// 递归从 ReadableStream 读取数据块，通过 callbacks.{onMessage,onError} 回调通知上层
function streamRead(reader, decoder, buffer, callbacks) {
  reader.read().then(({ done, value }) => {
    if (done) {
      if (buffer.trim()) buffer = processBuffer(buffer, callbacks.onMessage)
      callbacks.onMessage({ type: 'status', status: 'done' })
      return
    }
    buffer = processBuffer(buffer + decoder.decode(value, { stream: true }), callbacks.onMessage)
    streamRead(reader, decoder, buffer, callbacks)
  }).catch(e => { if (e.name !== 'AbortError') callbacks.onError(e) })
}

export function createSSE(url, body, onMessage, onError) {
  const controller = new AbortController()
  const token = localStorage.getItem('token')

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: controller.signal
  }).then(response => {
    streamRead(response.body.getReader(), new TextDecoder(), '', { onMessage, onError })
  }).catch(e => { if (e.name !== 'AbortError') onError(e) })

  return () => controller.abort()
}
