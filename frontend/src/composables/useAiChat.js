// AI对话业务: 状态=messages/loading/error 方法=sendMessage/generateQuestions/stop/clear | 数据流: 用户输入 → SSE流 → messages数组 → localStorage
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { chatStream, generateStream, generate, chat } from '../api/ai'
const STORAGE_KEY = 'ai_chat_messages'
const MAX_TOKENS = 4000
// 从字符串中提取JSON，支持markdown代码块
function extractJSON(str) {
  if (typeof str !== 'string') return null
  const match = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = match ? match[1].trim() : str.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return candidate.slice(start, end + 1)
  return null
}
// JSON题目解析：先直接解析，失败则提取代码块再解析
function tryParseQuestion(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed.title && Array.isArray(parsed.options) && (typeof parsed.answer === 'number' || typeof parsed.answer === 'string')) {
      return { type: 'question', parsed }
    }
  } catch { /* ignore */ }
  const extracted = extractJSON(content)
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted)
      if (parsed.title && Array.isArray(parsed.options) && (typeof parsed.answer === 'number' || typeof parsed.answer === 'string')) {
        return { type: 'question', parsed }
      }
    } catch { /* ignore */ }
  }
  return { type: 'text', parsed: null }
}
function saveToLocalStorage(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages.value)) } catch { /* ignore */ }
}
function loadFromLocalStorage(state) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      state.messages.value = JSON.parse(saved)
      state.messages.value.forEach(m => { if (!m.type) m.type = 'text' })
    }
  } catch { /* ignore */ }
}
function estimateTokens(msgs) {
  return msgs.reduce((sum, m) => sum + Math.ceil(m.content.length * 0.5), 0)
}
function trimMessages(state) {
  if (estimateTokens(state.messages.value) <= MAX_TOKENS) return
  const maxMessages = 10
  if (state.messages.value.length > maxMessages) {
    const removed = state.messages.value.length - maxMessages
    state.messages.value = state.messages.value.slice(-maxMessages)
    state.tokenWarning.value = `对话过长，已裁剪最早${removed}条消息`
    setTimeout(() => { state.tokenWarning.value = null }, 3000)
  }
}
function abortCurrent(state) { if (typeof state.sseState.close === 'function') { state.sseState.close(); state.sseState.close = null } }
function buildOnMessage(state, type, input, onComplete) {
  return (data) => {
    if (data.type === 'status' && data.status === 'thinking') {
      const last = state.messages.value[state.messages.value.length - 1]
      if (last && last.role === 'assistant') last.type = 'thinking'
    } else if (data.type === 'content') {
      const last = state.messages.value[state.messages.value.length - 1]
      if (last && last.role === 'assistant') {
        last.content += data.content
        if (last.type === 'thinking') last.type = 'generating'
        saveToLocalStorage(state)
      }
    } else if (data.type === 'status' && data.status === 'done') {
      const last = state.messages.value[state.messages.value.length - 1]
      if (last && last.role === 'assistant') {
        const result = tryParseQuestion(last.content)
        last.type = result.type
        last.parsed = result.parsed
      }
      state.loading.value = false; saveToLocalStorage(state); if (onComplete) onComplete()
    } else if (data.type === 'error') { handleError(data.error, { type, input, state, onComplete }) }
  }
}
function callSSE(type, input, state, onComplete) {
  abortCurrent(state)
  state.loading.value = true
  state.error.value = null
  state.sseState.retryCount = 0
  trimMessages(state)
  const onMessage = buildOnMessage(state, type, input, onComplete)
  const onError = (e) => handleError(e.message || '连接失败', { type, input, state, onComplete })
  state.sseState.close = type === 'chat' ? chatStream(input, onMessage, onError) : generateStream(input, onMessage, onError)
}
function handleError(errMsg, ctx) {
  if ((errMsg.includes('timeout') || errMsg.includes('network')) && ctx.state.sseState.retryCount < 1) {
    ctx.state.sseState.retryCount++; ctx.state.error.value = '连接中断，正在重试...'; setTimeout(() => callSSE(ctx.type, ctx.input, ctx.state, ctx.onComplete), 1000); return
  }
  fallbackToNonStream(ctx.type, ctx.input, ctx.state, ctx.onComplete)
}
async function fallbackToNonStream(type, input, state, onComplete) {
  try {
    const res = type === 'chat' ? await chat(input) : await generate(input)
    const last = state.messages.value[state.messages.value.length - 1]
    if (last && last.role === 'assistant') {
      const content = res.reply || res.question || ''
      last.content = typeof content === 'object' ? JSON.stringify(content) : content
      const result = tryParseQuestion(last.content)
      last.type = result.type
      last.parsed = result.parsed
    }
    state.loading.value = false; saveToLocalStorage(state); if (onComplete) onComplete()
  } catch {
    state.loading.value = false
    state.error.value = 'AI服务暂不可用，请稍后重试'
  }
}
function sendMessage(content, state) {
  if (!content.trim()) return
  state.messages.value.push({ role: 'user', content })
  state.messages.value.push({ role: 'assistant', content: '', type: 'pending' })
  saveToLocalStorage(state); callSSE('chat', content, state)
}
function generateQuestions(params, state) {
  const prompt = `请生成一道${params.category}方向的${params.difficulty}难度面试题`
  state.messages.value.push({ role: 'user', content: prompt })
  state.messages.value.push({ role: 'assistant', content: '', type: 'pending' })
  saveToLocalStorage(state); callSSE('generate', prompt, state)
}
function stop(state) { abortCurrent(state); state.loading.value = false }
function clear(state) { state.messages.value = []; localStorage.removeItem(STORAGE_KEY) }
export function useAiChat() {
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const tokenWarning = ref(null)
  const sseState = reactive({ close: null, retryCount: 0 })
  const state = { messages, loading, error, tokenWarning, sseState }
  onMounted(() => { loadFromLocalStorage(state) })
  onUnmounted(() => { abortCurrent(state) })
  return {
    messages, loading, error, tokenWarning,
    sendMessage: (content) => sendMessage(content, state),
    generateQuestions: (params) => generateQuestions(params, state),
    stop: () => stop(state),
    clear: () => clear(state)
  }
}
