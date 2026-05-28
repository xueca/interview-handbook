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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 从路由参数获取答题结果
const result = computed(() => {
  return JSON.parse(decodeURIComponent(route.query.result || '{}'))
})

const score = computed(() => result.value.score || 0)
const correctCount = computed(() => result.value.correctCount || 0)
const answeredCount = computed(() => result.value.answeredCount || 0)
const totalCount = computed(() => result.value.totalCount || 0)

function goBack() {
  router.push('/')
}

function retry() {
  router.push('/quiz')
}
</script>

<style scoped>
.result-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: calc(100vw - 220px);  /* 视口宽度减去侧边栏宽度 */
  position: fixed;              /* 固定定位 */
  left: 220px;                  /* 从侧边栏右边开始 */
  top: 0;                       /* 从顶部开始 */
  background: #f5f7fa;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
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
</style>