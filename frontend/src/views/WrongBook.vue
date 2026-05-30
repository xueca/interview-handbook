<template>
  <div class="wrongbook-container">
    <!-- 顶部栏 -->
    <div class="wrongbook-header">
      <h2>错题回顾</h2>
      <el-button type="danger">+ 标记错题</el-button>
    </div>

    <!-- 如果没有错题 -->
    <div v-if="wrongList.length === 0" class="empty-state">
      <el-empty description="全部答对，继续保持！" />
    </div>

    <!-- 错题内容区 -->
    <div v-else class="wrongbook-content">
      <!-- 第 X / 共 Y 题 -->
      <div class="progress-bar">
        <span>第 {{ currentIndex + 1 }} 题 / 共 {{ wrongList.length }} 题</span>
      </div>

      <!-- 当前错题 -->
      <div class="question-review">
        <!-- 题目标题 -->
        <h3 class="question-title">{{ currentQuestion.title }}</h3>

        <!-- 答案对比区 -->
        <div class="answer-compare">
          <!-- 你的错误答案（红色） -->
          <div class="answer-box wrong-answer">
            <div class="answer-label">✗ 错误答案</div>
            <div class="answer-content">{{ formatUserAnswer }}</div>
          </div>
          <!-- 正确答案（绿色） -->
          <div class="answer-box correct-answer">
            <div class="answer-label">✓ 正确答案</div>
            <div class="answer-content">{{ currentQuestion.answer }}</div>
          </div>
        </div>

        <!-- 标签 -->
        <div class="question-tags">
          <el-tag type="warning">分类：{{ currentQuestion.category }}</el-tag>
          <el-tag type="danger">难度：{{ currentQuestion.difficulty }}</el-tag>
        </div>

        <!-- 解析 -->
        <div class="analysis-section">
          <div class="analysis-title">题目解析</div>
          <div class="analysis-content">{{ currentQuestion.analysis || '暂无解析' }}</div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="action-buttons">
          <el-button type="primary" @click="exportWrong">导出错题</el-button>
          <el-button type="success" @click="retryQuestion">重新作答</el-button>
          <el-button class="collect-btn" @click="collectQuestion">收藏本题</el-button>
        </div>
      </div>

      <!-- 底部导航 -->
      <div class="question-nav">
        <el-button :disabled="currentIndex === 0" @click="prevQuestion">上一题</el-button>
        <el-progress :percentage="progressPercent" class="nav-progress" />
        <el-button :disabled="currentIndex === wrongList.length - 1" @click="nextQuestion">下一题</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getWrongRecords } from '../api/records'
import { collectQuestionApi } from '../api/questions'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 错题列表
const wrongList = ref([])

// 当前显示的错题索引
const currentIndex = ref(0)

// 当前错题
const currentQuestion = computed(() => {
  return wrongList.value[currentIndex.value] || {}
})

// 进度百分比
const progressPercent = computed(() => {
  if (wrongList.value.length === 0) return 0
  return Math.round(((currentIndex.value + 1) / wrongList.value.length) * 100)
})

// 格式化用户的错误答案
const formatUserAnswer = computed(() => {
  const answer = currentQuestion.value.userAnswer
  if (!answer) return '未作答'
  if (Array.isArray(answer)) return answer.join(', ')
  return answer
})

// 加载错题数据
async function loadWrongRecords() {
  try {
    const res = await getWrongRecords()
    if (res.code === 0) {
      wrongList.value = res.data || []
    }
  } catch (error) {
    console.error('加载错题失败:', error)
  }
}

// 上一题
function prevQuestion() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

// 下一题
function nextQuestion() {
  if (currentIndex.value < wrongList.value.length - 1) {
    currentIndex.value++
  }
}

// 重新作答
function retryQuestion() {
  // 跳转到答题页，带上当前题目的 questionId
  router.push({
    path: '/quiz',
    query: { 
      wrongId: currentQuestion.value.questionId,
      recordId: currentQuestion.value.recordId,
      mode: 'wrong'  // 标记为错题重做模式
    }
  })
}

// 导出错题
function exportWrong() {
   if (wrongList.value.length === 0) {
    ElMessage.warning('没有错题可以导出')
    return
  }
  // 生成文本内容
  let text = `=== 错题本 ===\n`
  text += `导出时间：${new Date().toLocaleString()}\n`
  text += `共 ${wrongList.value.length} 道错题\n\n`
  wrongList.value.forEach((q, index) => {
    text += `【第 ${index + 1} 题】${q.title}\n`
    text += `你的答案：${q.userAnswer ? (Array.isArray(q.userAnswer) ? q.userAnswer.join(', ') : q.userAnswer) : '未作答'}\n`
    text += `正确答案：${q.answer}\n`
    text += `分类：${q.category || '未知'} | 难度：${q.difficulty || '未知'}\n`
    text += `解析：${q.analysis || '暂无'}\n`
    text += `----------------------\n`
  })
  // 复制到剪贴板
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('错题已复制到剪贴板，可粘贴到文档中保存')
  }).catch(() => {
    // 降级方案：如果剪贴板 API 不可用，自动选中文本
    ElMessage.info('请手动复制下方文本')
    console.log(text)
  })
}

// 收藏本题
function collectQuestion() {
  // 获取当前题目的 ID
  const questionId = currentQuestion.value.questionId
  if (!questionId) {
    ElMessage.warning('题目ID不存在')
    return
  }
  
  // 调用收藏接口
  collectQuestionApi(questionId).then(res => {
    if (res.code === 0) {
      ElMessage.success('收藏成功')
    } else {
      ElMessage.error(res.message || '收藏失败')
    }
  }).catch(error => {
    console.error('收藏失败:', error)
    ElMessage.error('收藏失败')
  })
}

onMounted(() => {
  loadWrongRecords()
})
</script>

<style scoped>
.wrongbook-container {
  margin-left: 220px;
  min-height: 100vh;
  padding: 20px;
  background: #f5f7fa;
  box-sizing: border-box;
}

.wrongbook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px;
}

.progress-bar {
  text-align: center;
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
}

.question-review {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  max-width: 900px;
  margin: 0 auto;
}

.question-title {
  font-size: 18px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.answer-compare {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.answer-box {
  flex: 1;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.wrong-answer {
  background: #ffebee;
  border: 2px solid #ef9a9a;
}

.correct-answer {
  background: #e8f5e9;
  border: 2px solid #a5d6a7;
}

.answer-label {
  font-weight: bold;
  margin-bottom: 8px;
}

.wrong-answer .answer-label {
  color: #c62828;
}

.correct-answer .answer-label {
  color: #2e7d32;
}

.answer-content {
  font-size: 16px;
}

.question-tags {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
}

.analysis-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.analysis-title {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}

.analysis-content {
  color: #555;
  line-height: 1.8;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.collect-btn {
  background: #9c27b0 !important;
  border-color: #9c27b0 !important;
  color: white !important;
}

.collect-btn:hover {
  background: #7b1fa2 !important;
  border-color: #7b1fa2 !important;
}

.question-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
}

.nav-progress {
  flex: 1;
}

@media (max-width: 768px) {
  .wrongbook-container {
    margin-left: 0;
    padding: 12px;
  }
  .answer-compare {
    flex-direction: column;
  }
}
</style>