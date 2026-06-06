/**
 * SSE 流式请求封装
 * 只负责 HTTP 连接，不处理业务状态
 */

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
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              onMessage(data)
            } catch (e) { /* ignore parse error */ }
          }
        })
        read()
      }).catch(onError)
    }
    read()
  }).catch(onError)

  return { close: () => controller.abort() }
}
