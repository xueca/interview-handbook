<!-- AI对话页: 消息列表+输入框+快捷出题 → useAiChat() -->
<script setup>
import { ref, nextTick, watch } from 'vue'
import { useAiChat } from '../composables/useAiChat'
import { ElMessage } from 'element-plus'

const { messages, loading, error, sendMessage, generateQuestions, stop } = useAiChat()

const inputValue = ref('')
const messagesRef = ref(null)

// 快捷出题选项
const quickCategory = ref('JavaScript')
const quickDifficulty = ref('medium')
const categories = ['JavaScript', 'Vue', 'CSS', '网络', '工程化']
const difficulties = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' }
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

// 消息列表自动滚动到底部
watch(messages, () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}, { deep: true })

// 错误提示
watch(error, (val) => {
  if (val) ElMessage.error(val)
})
</script>

<template>
  <div class="ai-chat">
    <h2>AI 面试助手</h2>

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
        <el-button v-if="loading" type="danger" @click="stop">停止</el-button>
      </div>
    </el-card>

    <!-- 消息列表 -->
    <el-card shadow="hover" class="messages-card">
      <div ref="messagesRef" class="messages-list">
        <div v-if="messages.length === 0" class="empty-tip">
          开始和AI对话吧！可以提问技术问题，或使用快捷出题功能。
        </div>
        <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role]">
          <div class="message-role">{{ msg.role === 'user' ? '我' : 'AI' }}</div>
          <div class="message-content">{{ msg.content }}</div>
        </div>
      </div>
    </el-card>

    <!-- 输入区 -->
    <div class="input-row">
      <el-input
        v-model="inputValue"
        placeholder="输入你的问题..."
        @keyup.enter="handleSend"
        :disabled="loading"
        style="flex: 1"
      />
      <el-button type="primary" :loading="loading" @click="handleSend">发送</el-button>
    </div>
  </div>
</template>

<style scoped>
.ai-chat { max-width: 900px; margin: 0 auto; }
.ai-chat h2 { margin: 0 0 16px 0; font-size: 20px; color: #303133; }
.quick-section { margin-bottom: 16px; }
.quick-row { display: flex; gap: 12px; align-items: center; }
.messages-card { margin-bottom: 16px; }
.messages-list { height: 400px; overflow-y: auto; padding: 8px; }
.empty-tip { text-align: center; color: #909399; padding: 60px 0; font-size: 14px; }
.message { margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; }
.message.user { background: #ecf5ff; margin-left: 40px; }
.message.assistant { background: #f4f4f5; margin-right: 40px; }
.message-role { font-size: 12px; color: #909399; margin-bottom: 4px; }
.message-content { font-size: 14px; color: #303133; line-height: 1.6; white-space: pre-wrap; }
.input-row { display: flex; gap: 12px; }
</style>
