// SSE 流式请求封装 | 数据流: createSSE → fetch → ReadableStream → onMessage/onError

function processBuffer(buffer, onMessage) {
  const lines = buffer.split('\n\n')
  const remaining = lines.pop() || ''
  lines.forEach(line => {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6))
        onMessage(data)
      } catch { /* ignore parse error */ }
    }
  })
  return remaining
}

export function createSSE(url, body, onMessage, onError) {
  const controller = new AbortController()
  const token = localStorage.getItem('token')

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body),
    signal: controller.signal
  }).then(response => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) return
        buffer += decoder.decode(value, { stream: true })
        buffer = processBuffer(buffer, onMessage)
        read()
      }).catch(e => { if (e.name !== 'AbortError') onError(e) })
    }
    read()
  }).catch(e => { if (e.name !== 'AbortError') onError(e) })

  return () => controller.abort()
}
