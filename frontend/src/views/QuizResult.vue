<template>
  <div class="result-container">
    <el-card class="result-card">
      <div class="result-header">
        <div class="score-circle">
          <span class="score-value">{{ score }}</span>
          <span class="score-label">分</span>
        </div>
        <p class="result-text">{{ score >= 60 ? '恭喜通过！' : '继续加油！' }}</p>
      </div>
      
      <div class="stats">
        <div class="stat-item">
          <span class="stat-value correct">{{ correctCount }}</span>
          <span class="stat-label">正确</span>
        </div>
        <div class="stat-item">
          <span class="stat-value wrong">{{ totalCount - correctCount }}</span>
          <span class="stat-label">错误</span>
        </div>
        <div class="stat-item">
          <span class="stat-value skip">{{ totalCount - answeredCount }}</span>
          <span class="stat-label">未答</span>
        </div>
      </div>
      
      <div class="result-actions">
        <el-button @click="goBack">返回首页</el-button>
        <el-button type="primary" @click="retry">再做一次</el-button>
      </div>
    </el-card>
        <!-- 题目详情列表 -->
    <el-card class="questions-card">
      <template #header>
        <span>答题详情</span>
      </template>
      
      <!-- 用 v-for 循环每道题 -->
      <div class="questions-list">
        <div 
          v-for="(q, index) in questions" 
          :key="q.id" 
          class="question-item"
          :class="{ correct: isCorrect(q), wrong: !isCorrect(q) }"
        >
          <!-- 点击头部切换展开/折叠 -->
          <div class="question-header" @click="toggleExpand(q.id)">
            <!-- 题号 -->
            <span class="question-number">{{ index + 1 }}</span>
            <!-- 对错状态图标 -->
            <span v-if="isCorrect(q)" class="status-icon correct-icon">✓</span>
            <span v-else class="status-icon wrong-icon">✗</span>
            <!-- 题目标题 -->
            <span class="question-title">{{ q.title }}</span>
            <!-- 展开/折叠箭头 -->
            <span class="expand-icon">{{ expandedIds.includes(q.id) ? '▼' : '▶' }}</span>
          </div>
          
          <!-- 展开后显示解析内容 -->
          <div v-if="expandedIds.includes(q.id)" class="question-detail">
            <!-- 解析内容 -->
            <div class="analysis-section">
              <h4>📖 解析</h4>
              <p>{{ q.analysis || '暂无解析' }}</p>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed,ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecordStore } from '../stores/record'

const route = useRoute()
const router = useRouter()

// 从 Pinia Store 获取答题结果
const recordStore = useRecordStore()
const result = computed(() => recordStore.lastQuizResult || {})

const score = computed(() => result.value.score || 0)
const correctCount = computed(() => result.value.correctCount || 0)
const answeredCount = computed(() => result.value.answeredCount || 0)
const totalCount = computed(() => result.value.totalCount || 0)
const questions = computed(() => result.value.questions || [])
const userAnswers = computed(() => result.value.userAnswers || {})
const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F']

// 记录当前展开了哪些题目ID
const expandedIds = ref([])

// 切换展开,折叠
function toggleExpand(questionId) {
  const idx = expandedIds.value.indexOf(questionId)
  if (idx > -1) {
    // 已存在，折叠（移除）
    expandedIds.value.splice(idx, 1)
  } else {
    // 不存在，展开（添加）
    expandedIds.value.push(questionId)
  }
}

function isCorrect(question) {
  // 1. 取出用户的答案（索引数组）
  const userAnswer = userAnswers.value[question.id]

  // 2. 如果没选这道题，直接返回 false
  if (!userAnswer || userAnswer.length === 0) return false

  // 3. 处理单选题
  if (question.type === 'single') {
    // 把用户选的索引[0] 转成字母 'A'
    const userLetter = optionLabels[userAnswer[0]]
    // 跟正确答案的字母比较
    return userLetter === question.answer
  }
  // 处理多选题：把所有选项转成字母，排序后比较
   if (question.type === 'multiple') {
    // 把用户的索引数组转成字母，比如 [1,3] → ['B','D']
    const userLetters = userAnswer.map(idx => optionLabels[idx]).sort()
    // 把正确答案字符串拆成数组并排序，比如 'BD' → ['B','D']
    const correctLetters = question.answer.split('').sort()
    // 比较
    return userLetters.join('') === correctLetters.join('')
  }
  
}

function goBack() {
  router.push('/')
}

function retry() {
  router.push({
    path: '/quiz',
    query: { 
      category: route.query.category || '',
      random: Date.now()  // ← 加一个随机数参数
    }
  })
}
</script>

<style scoped>
.result-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  margin-left: 220px;     
  min-height: 100vh;          
  top: 0;                      
  background: #f5f7fa;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}
@media (max-width: 768px) {
  .result-container {
    margin-left: 0;
    padding: 12px;
  }
}

.result-card {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.result-header {
  margin-bottom: 32px;
}

.score-circle {
  width: 120px;
  height: 120px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
}

.score-label {
  font-size: 14px;
}

.result-text {
  font-size: 20px;
  color: #333;
}

.stats {
  display: flex;
  justify-content: space-around;
  padding: 24px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-value.correct {
  color: #4caf50;
}

.stat-value.wrong {
  color: #f44336;
}

.stat-value.skip {
  color: #9e9e9e;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.result-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}
/*--------------------------------------------------------*/
/* 题目卡片 */
.questions-card {
  width: 100%;
  max-width: 800px;
  margin-top: 20px;
}
/* 每道题的条目 */
.question-item {
  border-bottom: 1px solid #eee;
  padding: 12px 0;
}
/* 题目头部（点击区域） */
.question-header {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

/* 状态图标 */
.status-icon {
  font-size: 18px;
  font-weight: bold;
}
.correct-icon { color: #2faa34; }
.wrong-icon { color: #e9190aec; }

/*--------------------------------------------------------*/
/*--------------------------------------------------------*/
/* 展开后的题目详情区域 */
.question-detail {
  margin-top: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

/* 解析区域 */
.analysis-section {
  padding: 12px;
  background: #fff8e1;
  border-left: 4px solid #f79706;
  border-radius: 4px;
}

.analysis-section h4 {
  margin: 0 0 8px 0;
  color: #e65100;
  font-size: 14px;
}

.analysis-section p {
  margin: 0;
  color: #555;
  font-size: 14px;
  line-height: 1.8;
}

</style>