// AI对话业务: 状态=messages/loading/error 方法=sendMessage/generateQuestions/stop | 数据流: 用户输入 → SSE流 → messages数组
import { ref, reactive, onUnmounted } from 'vue'
import { chatStream, generateStream } from '../api/ai'

export function useAiChat() {
  // 消息列表：{ role: 'user'|'assistant', content: string }
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)

  // SSE连接状态（用reactive对象，不是模块级变量）
  const sseState = reactive({
    controller: null,  // AbortController实例
    close: null        // SSE关闭函数
  })

  /**
   * 中断当前SSE连接
   * 每次新请求前调用，防止竞态条件
   */
  function abortCurrent() {
    if (sseState.close) {
      sseState.close()
      sseState.close = null
    }
  }

  /**
   * 公共SSE调用逻辑
   * @param {string} type - 'chat' | 'generate'
   * @param {string} input - 用户消息或主题
   * @param {function} onComplete - 流结束时的回调
   */
  function callSSE(type, input, onComplete) {
    abortCurrent()
    loading.value = true
    error.value = null

    const onMessage = (data) => {
      if (data.type === 'content') {
        // 追加内容到最后一条assistant消息
        const last = messages.value[messages.value.length - 1]
        if (last && last.role === 'assistant') {
          last.content += data.content
        }
      } else if (data.type === 'status' && data.status === 'done') {
        loading.value = false
        if (onComplete) onComplete()
      } else if (data.type === 'error') {
        loading.value = false
        error.value = data.error
      }
    }

    const onError = (e) => {
      loading.value = false
      error.value = e.message || '连接失败'
    }

    // 调用对应的SSE接口
    if (type === 'chat') {
      sseState.close = chatStream(input, onMessage, onError)
    } else {
      sseState.close = generateStream(input, onMessage, onError)
    }
  }

  /**
   * 发送用户消息
   * @param {string} content - 用户输入
   */
  function sendMessage(content) {
    if (!content.trim()) return
    // 添加用户消息
    messages.value.push({ role: 'user', content })
    // 添加空的assistant消息占位
    messages.value.push({ role: 'assistant', content: '' })
    // 调用SSE
    callSSE('chat', content)
  }

  /**
   * 快捷出题
   * @param {object} params - { category, difficulty }
   */
  function generateQuestions(params) {
    const { category, difficulty } = params
    const prompt = `请生成一道${category}方向的${difficulty}难度面试题`
    messages.value.push({ role: 'user', content: prompt })
    messages.value.push({ role: 'assistant', content: '' })
    callSSE('generate', prompt, () => {
      // 出题完成后可以解析JSON（Day 18实现）
    })
  }

  /**
   * 停止当前生成
   */
  function stop() {
    abortCurrent()
    loading.value = false
  }

  // 组件卸载时清理SSE连接
  onUnmounted(() => {
    abortCurrent()
  })

  return { messages, loading, error, sendMessage, generateQuestions, stop }
}
