<template>
  <div class="aichat-container">
    <div class="aichat-main">

      <div class="aichat-header">
        <span>AI 智能出题</span>
      </div>

      <div class="aichat-messages">
        <div v-if="messages.length === 0" class="empty-state">
          点击下方按钮，让 AI 为你出一道面试题
        </div>
        <div
          v-for="(msg, index) in messages"
          :key="msg.id"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-role">{{ msg.role === 'user' ? '我' : 'AI' }}</div>
          
          <!-- 情况1：正在生成中（只有最后一条消息可能处于此状态） -->
          <div v-if="!msg.isDone && index === messages.length - 1 && msg.role === 'ai'" class="message-content streaming-box">
            <div class="streaming-indicator">
              <span class="dot-pulse"></span>
              正在生成题目...（已接收 {{ msg.content.length }} 字符）
            </div>
          </div>
          
          <!-- 情况2：生成完成且解析成功 -->
          <template v-else-if="msg.isDone && msg.parsedQuestions && msg.parsedQuestions.length">
            <div class="message-content">
              <span v-if="!msg.isAdded" class="success-hint">✅ 题目生成完成</span>
              <span v-else class="added-hint">✅ 已加入题库</span>
            </div>
            <div class="questions-display">
              <div v-for="(q, qi) in msg.parsedQuestions" :key="qi" class="question-card">
                <div class="question-title">{{ q.title }}</div>
                <div class="question-options">
                  <div v-for="opt in q.options" :key="opt.key" class="option-item">
                    <span class="option-key">{{ opt.key }}</span>
                    {{ opt.text }}
                  </div>
                </div>
                <div class="question-answer">答案：{{ q.answer }}</div>
                <div class="question-analysis">{{ q.analysis }}</div>
              </div>
            </div>
            <div class="message-actions" v-if="!msg.isAdded">
              <el-button
                type="success"
                size="small"
                :loading="msg.isSaving"
                @click="handleAddToBank(msg)"
              >
                {{ msg.isSaving ? '添加中...' : '加入题库' }}
              </el-button>
            </div>
          </template>
          
          <!-- 情况3：生成完成但解析失败，显示友好提示 -->
          <div v-else-if="msg.isDone" class="message-content">
            <div class="parse-error-hint">JSON 解析失败，请重试</div>
          </div>
          
          <!-- 情况4：其他情况（理论上不会进入） -->
          <div v-else class="message-content">{{ msg.content }}</div>
        </div>
      </div>

      <div class="aichat-footer">
        <div class="aichat-options">
          <el-select
            v-model="selectedCategory"
            placeholder="选择分类"
            size="default"
            style="width:140px"
            :disabled="isGenerating"
          >
            <el-option label="JavaScript" value="JavaScript" />
            <el-option label="Vue / React" value="Vue / React" />
            <el-option label="CSS" value="CSS" />
            <el-option label="网络 / 浏览器" value="网络 / 浏览器" />
            <el-option label="工程化" value="工程化" />
          </el-select>
          <el-select
            v-model="selectedDifficulty"
            placeholder="选择难度"
            size="default"
            style="width:120px"
            :disabled="isGenerating"
          >
            <el-option label="简单" value="easy" />
            <el-option label="中等" value="medium" />
            <el-option label="困难" value="hard" />
          </el-select>
          <el-button
            type="primary"
            :loading="isGenerating"
            @click="handleGenerate"
          >
            {{ isGenerating ? '生成中...' : 'AI 出题' }}
          </el-button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import {ref, reactive, onUnmounted} from 'vue'
import { ElMessage } from 'element-plus'
import {createSSEConnection} from '../utils/sse'
import {generate} from '../api/ai'
import {addQuestionsApi} from '../api/questions'

// 消息列表，每条消息独立维护自己的状态
const messages = ref([])
const isGenerating = ref(false)  // 是否正在生成（控制按钮状态）
const selectedCategory = ref('JavaScript')
const selectedDifficulty = ref('medium')

let closeSSE = null
let hasFellBack = false
let msgIdCounter = 0

// 生成唯一消息ID
function generateMsgId() {
  return ++msgIdCounter
}

// 修复 LLM 输出中常见的 JSON 格式错误
function repairJSON(text) {
  // 1. 修复被截断的 JSON：补全缺失的闭合
  let openBrackets = (text.match(/\[/g) || []).length
  let closeBrackets = (text.match(/\]/g) || []).length
  while (closeBrackets < openBrackets) {
    text += ']'
    closeBrackets++
  }
  let openBraces = (text.match(/\{/g) || []).length
  let closeBraces = (text.match(/\}/g) || []).length
  while (closeBraces < openBraces) {
    text += '}'
    closeBraces++
  }
  
  // 2. 修复未加引号的字符串值（如 "answer":C → "answer":"C"）
  //    匹配 : 后面跟着非引号、非数字、非 {}[]、非布尔、非 null 的 bare 值
  text = text.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]])/g, ':"$1"$2')
  
  // 3. 删除尾随逗号（数组/对象最后一个元素后面的逗号）
  text = text.replace(/,\s*([}\]])/g, '$1')
  
  return text
}

// 解析题目JSON
function tryParseQuestions(content) {
  let text = content.trim()
  
  // 处理被 ```json 或 ``` 包裹的代码块
  if (text.startsWith('```')) {
    text = text.slice(text.indexOf('\n') + 1)
    const lastIdx = text.lastIndexOf('```')
    if (lastIdx !== -1) text = text.slice(0, lastIdx).trim()
  }
  
  // 尝试找到 JSON 数组的开始位置
  const jsonStart = text.indexOf('[')
  const jsonEnd = text.lastIndexOf(']')
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    text = text.slice(jsonStart, jsonEnd + 1)
  }
  
  // 先尝试直接解析
  try {
    const result = JSON.parse(text)
    if (Array.isArray(result) && result.length) {
      return result
    }
  } catch (e) {
    console.warn('直接解析失败，尝试修复后重试:', e.message)
  }
  
  // 修复后重试
  const repaired = repairJSON(text)
  try {
    const result = JSON.parse(repaired)
    if (Array.isArray(result) && result.length) {
      console.log('修复后解析成功')
      return result
    }
  } catch (e) {
    console.error('修复后仍解析失败:', e.message, '原始内容:', content.slice(0, 200))
  }
  return null
}

function handleGenerate() {
  if (isGenerating.value) return
  
  isGenerating.value = true
  hasFellBack = false
  
  // 创建新消息对象，包含独立的状态（用 reactive 确保闭包中修改触发响应式更新）
  const newMsg = reactive({
    id: generateMsgId(),
    role: 'ai',
    content: '',           // 累积的原始内容
    isDone: false,         // 是否完成
    parsedQuestions: null, // 解析后的题目
    isSaving: false,       // 是否正在保存
    isAdded: false         // 是否已加入题库
  })
  messages.value.push(newMsg)
  
  const params = {
    category: selectedCategory.value,
    difficulty: selectedDifficulty.value,
    count: '1'
  }
  
  closeSSE = createSSEConnection(
    params,
    {
      onMessage(data) {
        if (hasFellBack) return
        // 累积内容到当前消息
        newMsg.content += data.content || ''
      },
      async onError(err) {
        console.error('SSE 错误', err)
        if (hasFellBack) return
        hasFellBack = true
        closeSSE?.()
        
        // 标记为完成（虽然是错误完成）
        newMsg.isDone = true
        newMsg.content += '\n\n[SSE 连接失败，切换到非流式模式...]\n'
        
        try {
          const res = await generate(params)
          if (res.code === 0 && res.data) {
            newMsg.content = JSON.stringify(res.data, null, 2)
            newMsg.parsedQuestions = res.data
          } else {
            newMsg.content += '\n生成失败：' + (res.message || '未知错误')
          }
        } catch (fallbackErr) {
          newMsg.content += '\n降级请求也失败了：' + fallbackErr.message
        } finally {
          isGenerating.value = false
        }
      },
      onDone() {
        if (hasFellBack) return
        hasFellBack = true
        
        // 标记为完成并解析题目
        newMsg.isDone = true
        newMsg.parsedQuestions = tryParseQuestions(newMsg.content)
        isGenerating.value = false
      }
    }
  )
}

async function handleAddToBank(msg) {
  if (!msg.parsedQuestions || msg.parsedQuestions.length === 0) return
  
  msg.isSaving = true
  try {
    const res = await addQuestionsApi(msg.parsedQuestions)
    if (res.code === 0) {
      ElMessage.success(res.message || '添加成功')
      msg.isAdded = true  // 标记为已添加，保留 parsedQuestions 以维持卡片展示
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    msg.isSaving = false
  }
}

onUnmounted(() => {
  closeSSE?.()
})
</script>

<style scoped>
.aichat-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.aichat-main {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
}

.aichat-header {
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}

.aichat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 100px;
}

.message-item {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  max-width: 80%;
}

.message-item.user {
  background: #ecf5ff;
  margin-left: auto;
}

.message-item.ai {
  background: #f4f4f5;
  margin-right: auto;
}

.message-role {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.message-actions {
  margin-top: 8px;
  text-align: right;
}

.parse-error-hint {
  text-align: center;
  color: #999;
  padding: 40px 0;
  font-size: 14px;
}

.aichat-footer {
  padding: 16px;
  border-top: 1px solid #eee;
  text-align: center;
}

.aichat-options {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

/* ===== 流式加载指示器 ===== */
.streaming-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.streaming-indicator {
  color: #409EFF;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #409EFF;
  display: inline-block;
  position: relative;
  animation: dotPulse 1.4s infinite ease-in-out both;
}

.dot-pulse::before,
.dot-pulse::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #409EFF;
  position: absolute;
  top: 0;
  animation: dotPulse 1.4s infinite ease-in-out both;
}

.dot-pulse::before {
  left: -14px;
  animation-delay: -0.32s;
}

.dot-pulse::after {
  left: 14px;
  animation-delay: 0.32s;
}

@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* ===== 格式化题目卡片 ===== */
.questions-display {
  margin-top: 12px;
}

.question-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.question-title {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #303133;
}

.question-options {
  margin-bottom: 12px;
}

.option-item {
  padding: 4px 0;
  font-size: 14px;
  color: #606266;
}

.option-key {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #ecf5ff;
  color: #409EFF;
  border-radius: 4px;
  margin-right: 8px;
  font-weight: bold;
  font-size: 13px;
}

.question-answer {
  font-size: 14px;
  color: #67C23A;
  font-weight: bold;
  margin-bottom: 8px;
}

.question-analysis {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}

/* 成功提示 */
.success-hint {
  color: #67C23A;
  font-size: 14px;
  padding: 8px 0;
}

/* 已添加提示 */
.added-hint {
  color: #909399;
  font-size: 14px;
  padding: 8px 0;
}
</style>
