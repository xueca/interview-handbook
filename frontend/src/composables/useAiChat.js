// AI对话业务: 状态=messages/loading/error 方法=sendMessage/generateQuestions/stop/clear | 数据流: 用户输入 → SSE流 → messages数组 → localStorage
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { chatStream, generateStream, generate, chat } from '../api/ai'
import { tryParseQuestion, toQuestion } from '../utils/questionParser'
const STORAGE_KEY = 'ai_chat_messages'
const MAX_TOKENS = 4000
function saveToLocalStorage(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages.value)) } catch { /* ignore */ }
}
function loadFromLocalStorage(state) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    state.messages.value = JSON.parse(saved)
    state.messages.value.forEach(m => { if (!m.type) m.type = 'text' })
  } catch { /* ignore */ }
}
// 按 token 预算从最新往前保留消息；修复：原先仅在条数>10 时裁剪，少量超长消息会静默超限且无提示
function trimMessages(state) {
  const msgs = state.messages.value
  let tokens = 0, cut = 0
  for (let i = msgs.length - 1; i >= 0; i--) {
    tokens += Math.ceil((msgs[i].content || '').length * 0.5)
    // 超预算且裁剪后仍能留 ≥2 条（保住当前一问一答）才截断
    if (tokens > MAX_TOKENS && i <= msgs.length - 3) { cut = i + 1; break }
  }
  if (!cut) return
  state.messages.value = msgs.slice(cut)
  state.tokenWarning.value = `对话过长，已裁剪最早${cut}条消息`
  setTimeout(() => { state.tokenWarning.value = null }, 3000)
}
function abortCurrent(state) { if (typeof state.sseState.close === 'function') { state.sseState.close(); state.sseState.close = null } }
// 取消息列表末尾的 assistant 占位消息（流式内容写入对象）
function lastAssistant(state) {
  const last = state.messages.value[state.messages.value.length - 1]
  return last && last.role === 'assistant' ? last : null
}
// 流式结束收尾：出题场景解析失败时降级非流式（后端 repairJSON 更稳），对话场景保留文本
// 关键：出题解析失败绝不把裸 JSON 当文本渲染，统一交给 fallbackToNonStream 兜底
function finalizeStream(type, input, state, onComplete) {
  const last = lastAssistant(state)
  if (!last) { finish(state, onComplete); return }
  const result = tryParseQuestion(last.content)
  // 出题解析失败：降级非流式重出，绝不把裸 JSON 当文本上屏
  if (type === 'generate' && result.type !== 'question') { fallbackToNonStream(type, input, state, onComplete); return }
  // 切成卡片后清空推理文本，释放 localStorage 占用
  if (result.type === 'question') last.reasoning = ''
  last.type = result.type; last.parsed = result.parsed
  finish(state, onComplete)
}
// 统一收尾：关闭 loading + 持久化 + 触发完成回调
function finish(state, onComplete) {
  state.loading.value = false; saveToLocalStorage(state); if (onComplete) onComplete()
}
function buildOnMessage(state, type, input, onComplete) {
  // 防止 [DONE] 被 processBuffer 和 stream EOF 双重触发导致 finalizeStream 执行两次
  let finalized = false
  return (data) => {
    const last = lastAssistant(state)
    if (typeof data.reasoning === 'string') {
      // 出题/对话通用：把模型推理文字逐字渲染到「思考中」气泡（天然打字效果），content 仍在后台累积
      if (last) { last.reasoning = (last.reasoning || '') + data.reasoning; last.type = 'thinking'; saveToLocalStorage(state) }
    } else if (typeof data.content === 'string') {
      // 出题：全程保持「思考中」不逐字暴露 JSON；对话：流式渲染文本
      if (last) { last.content += data.content; last.type = type === 'generate' ? 'thinking' : 'generating'; saveToLocalStorage(state) }
    } else if (data.type === 'status' && data.status === 'done' && !finalized) {
      // 已 finalize 后再收到 done 不再匹配此分支，等价于单次执行保护
      finalized = true
      finalizeStream(type, input, state, onComplete)
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
// 降级非流式：后端 generate 已走 repairJSON，响应更稳；对接后端 {code,message,data} 结构
// 出题降级仍解析失败时，宁可报错也不渲染裸 JSON（清空 content 防止 text 分支暴露原文）
async function fallbackToNonStream(type, input, state, onComplete) {
  try {
    const res = type === 'chat' ? await chat(input) : await generate(input)
    const last = lastAssistant(state)
    if (!last) { finish(state, onComplete); return }
    if (type === 'generate') {
      // data 为题目对象或数组，toQuestion 内部已处理数组包裹
      const q = toQuestion(res.data)
      if (q) { last.content = ''; last.type = 'question'; last.parsed = q; finish(state, onComplete); return }
      // 降级仍失败：友好提示，绝不上屏 JSON
      last.content = ''; last.type = 'text'
      state.loading.value = false; saveToLocalStorage(state)
      state.error.value = '题目生成失败，请重试'
      return
    }
    // 对话降级：取 data.content 文本
    last.content = (res.data && res.data.content) || ''
    last.type = 'text'; last.parsed = null
    finish(state, onComplete)
  } catch {
    const last = lastAssistant(state)
    if (last && type === 'generate') { last.content = ''; last.type = 'text' }
    state.loading.value = false
    state.error.value = 'AI服务暂不可用，请稍后重试'
  }
}
function sendMessage(content, state) {
  if (!content.trim()) return
  state.messages.value.push({ role: 'user', content })
  state.messages.value.push({ role: 'assistant', content: '', type: 'pending', reasoning: '' })
  saveToLocalStorage(state); callSSE('chat', content, state)
}
function generateQuestions(params, state) {
  const prompt = `请生成一道${params.category}方向的${params.difficulty}难度面试题`
  state.messages.value.push({ role: 'user', content: prompt })
  state.messages.value.push({ role: 'assistant', content: '', type: 'pending', reasoning: '' })
  // 传递 params 对象而非 prompt 字符串，后端 generateStream 从 body 中解构 category/difficulty/count
  saveToLocalStorage(state); callSSE('generate', params, state)
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
    clear: () => clear(state),
    // 标记某条消息的题目已入库（写入 localStorage，刷新后按钮仍保持禁用，防重复加入）
    markAdded: (i) => { if (messages.value[i]) { messages.value[i].added = true; saveToLocalStorage(state) } }
  }
}
