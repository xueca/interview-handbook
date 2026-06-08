<!-- AI对话页: 消息列表+输入框+快捷出题 → useAiChat() | 样式: styles/ai-chat.css -->
<script setup>
import { ref, nextTick, watch } from 'vue'
import { useAiChat } from '../composables/useAiChat'
import { ElMessage, ElMessageBox } from 'element-plus'
import AiQuestionCard from '../components/AiQuestionCard.vue'
import { renderMarkdown } from '../utils/markdown'
import { createQuestion } from '../api/questions'
import '../styles/ai-chat.css'

const { messages, loading, error, tokenWarning, sendMessage, generateQuestions, stop, clear } = useAiChat()

const inputValue = ref('')
const messagesRef = ref(null)

// 消息列表自动滚动到底部
watch(messages, () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}, { deep: true })

// 快捷出题选项
const quickCategory = ref('JavaScript')
const quickDifficulty = ref('medium')
const categories = ['JavaScript', 'Vue', 'CSS', '网络', '工程化']
const difficulties = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' }
]

// 推荐问题（空对话时显示）
const recommendedQuestions = [
  '出一道JavaScript闭包的面试题',
  'Vue的响应式原理是什么？',
  'CSS的BFC是什么？有什么应用场景？',
  'HTTP缓存机制是怎样的？'
]

// 发送消息
function handleSend() {
  if (!inputValue.value.trim()) return
  sendMessage(inputValue.value)
  inputValue.value = ''
}

// 快捷出题
function handleQuickGenerate() {
  generateQuestions({ category: quickCategory.value, difficulty: quickDifficulty.value })
}

// 清空对话
function handleClear() {
  ElMessageBox.confirm('确定要清空所有对话记录吗？', '提示', { type: 'warning' })
    .then(() => { clear(); ElMessage.success('对话已清空') })
    .catch(() => { })
}

// 点击推荐问题
function handleQuestionClick(q) {
  sendMessage(q)
}

// 发送/停止按钮切换
function handleSendOrStop() {
  if (loading.value) {
    stop()
  } else {
    handleSend()
  }
}

// 错误提示
watch(error, (val) => { if (val) ElMessage.error(val) })

// token溢出提示
watch(tokenWarning, (val) => { if (val) ElMessage.warning(val) })

// 加入题库
async function handleAddToBank(question) {
  try {
    await createQuestion(question)
    ElMessage.success('已加入题库')
  } catch {
    ElMessage.error('加入题库失败')
  }
}
</script>

<template>
  <div class="ai-chat">
    <div class="page-header">
      <h2>AI 面试助手</h2>
      <el-button type="danger" size="small" plain @click="handleClear">清空对话</el-button>
    </div>

    <!-- 快捷出题区 -->
    <el-card shadow="hover" class="quick-section">
      <div class="quick-row">
        <el-select v-model="quickCategory" placeholder="选择分类" style="width: 140px">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="quickDifficulty" placeholder="选择难度" style="width: 100px">
          <el-option v-for="d in difficulties" :key="d.value" :label="d.label" :value="d.value" />
        </el-select>
        <el-button type="primary" :loading="loading" @click="handleQuickGenerate">快捷出题</el-button>
      </div>
    </el-card>

    <!-- 消息列表 -->
    <el-card shadow="hover" class="messages-card">
      <div ref="messagesRef" class="messages-list">
        <!-- 空对话时显示推荐问题 -->
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-tip">开始和AI对话吧！可以提问技术问题，或使用快捷出题功能。</div>
          <div class="recommended-questions">
            <div class="rec-title">推荐问题</div>
            <div v-for="(q, i) in recommendedQuestions" :key="i" class="rec-item" @click="handleQuestionClick(q)">
              {{ q }}
            </div>
          </div>
        </div>
        <!-- 消息列表 -->
        <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role]">
          <div class="message-role">{{ msg.role === 'user' ? '我' : 'AI' }}</div>
          <!-- thinking: 思考中 -->
          <div v-if="msg.type === 'thinking'" class="thinking-indicator">
            <span class="thinking-icon">🤔</span>
            <span>正在思考题目...</span>
          </div>
          <!-- generating/pending: 流式文本+光标 -->
          <div v-else-if="msg.type === 'generating' || msg.type === 'pending'" class="message-content">
            {{ msg.content }}<span class="cursor-blink">▋</span>
          </div>
          <!-- question: 格式化卡片 -->
          <AiQuestionCard v-else-if="msg.type === 'question' && msg.parsed" :question="msg.parsed" @addToBank="handleAddToBank(msg.parsed)" />
          <!-- text: 普通文本（支持markdown渲染） -->
          <div v-else class="message-content" v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>
    </el-card>

    <!-- 输入区 -->
    <div class="input-row">
      <el-input
        v-model="inputValue"
        placeholder="输入你的问题..."
        @keyup.enter="handleSendOrStop"
        :disabled="loading"
        style="flex: 1"
      />
      <el-button v-if="loading" type="danger" @click="stop">停止生成</el-button>
      <el-button v-else type="primary" @click="handleSend">发送</el-button>
    </div>
  </div>
</template>
