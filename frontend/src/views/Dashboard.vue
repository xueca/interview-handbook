<template>
  <div class="dashboard-container">
    <!-- 顶部标题 -->
    <h1 class="dashboard-title">欢迎, {{ userStore.userInfo?.nickname || '用户' }}</h1>

    <!-- 统计卡片行 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-number">{{ stats?.totalQuestions || 0 }}</div>
        <div class="stat-label">总答题数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats?.accuracy || 0 }}%</div>
        <div class="stat-label">总正确率</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ todayCount }}</div>
        <div class="stat-label">今日答题</div>
      </div>
    </div>

    <!-- 图表区：折线图 + 柱状图 -->
    <div class="charts-row">
      <div class="chart-box">
        <h3>每日正确率趋势</h3>
        <div ref="trendChartRef" class="chart-container"></div>
      </div>
      <div class="chart-box">
        <h3>分类正确率</h3>
        <div ref="categoryChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 饼图区 -->
    <div class="chart-box full-width">
      <h3>难度分布</h3>
      <div ref="difficultyChartRef" class="chart-container"></div>
    </div>

    <!-- 快速开始 -->
    <div class="quick-start">
      <h3>快速开始</h3>
      <div class="quick-buttons">
        <el-button type="primary" @click="router.push('/questions')">去刷题</el-button>
        <el-button @click="router.push('/wrongbook')">错题本</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserstore } from '../stores/user'
import { useRecordStore } from '../stores/record'
import * as echarts from 'echarts'

const router = useRouter()
const userStore = useUserstore()
const recordStore = useRecordStore()

// 图表 DOM 引用
const trendChartRef = ref(null)
const categoryChartRef = ref(null)
const difficultyChartRef = ref(null)

// 图表实例
let trendChart = null
let categoryChart = null
let difficultyChart = null

// 统计数据
const stats = computed(() => recordStore.stats)

// 今日答题数（从 dailyTrend 取今天）
const todayCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const todayData = stats.value?.dailyTrend?.find(d => d.date === today)
  return todayData ? todayData.total : 0
})

// 渲染每日趋势折线图
function renderTrendChart() {
  if (!trendChartRef.value || !stats.value?.dailyTrend?.length) return
  trendChart = echarts.init(trendChartRef.value)
  const data = stats.value.dailyTrend
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.slice(5)) // 只显示 MM-DD
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    series: [{
      data: data.map(d => d.accuracy),
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.2 }
    }]
  })
}

// 渲染分类柱状图
function renderCategoryChart() {
  if (!categoryChartRef.value || !stats.value?.categoryStats?.length) return
  categoryChart = echarts.init(categoryChartRef.value)
  const data = stats.value.categoryStats
  categoryChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: data.map(d => d.category)
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    series: [{
      data: data.map(d => d.accuracy),
      type: 'bar',
      itemStyle: { borderRadius: [4, 4, 0, 0] }
    }]
  })
}

// 渲染难度饼图
function renderDifficultyChart() {
  if (!difficultyChartRef.value || !stats.value?.difficultyStats?.length) return
  difficultyChart = echarts.init(difficultyChartRef.value)
  const data = stats.value.difficultyStats.map(d => ({
    name: d.difficulty,
    value: d.total
  }))
  difficultyChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}题 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}\n{c}题' },
      data
    }]
  })
}

// 挂载时获取数据并渲染图表
onMounted(async () => {
  await recordStore.fetchStats()
  nextTick(() => {
    renderTrendChart()
    renderCategoryChart()
    renderDifficultyChart()
  })
})

// 窗口缩放时重绘图表
function handleResize() {
  trendChart?.resize()
  categoryChart?.resize()
  difficultyChart?.resize()
}
window.addEventListener('resize', handleResize)

// 卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  categoryChart?.dispose()
  difficultyChart?.dispose()
})
</script>

<style scoped>
.dashboard-container {
  margin-left: 220px;
  padding: 24px;
  width: 468px;
  min-height: 100vh;
  background: #f5f7fa;
  box-sizing: border-box;
}
.dashboard-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 24px;
}
.stats-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.stat-number {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
}
.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}
.charts-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.chart-box {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.chart-box h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}
.chart-box.full-width {
  margin-bottom: 16px;
}
.chart-container {
  width: 100%;
  height: 300px;
}
.quick-start {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.quick-start h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}
.quick-buttons {
  display: flex;
  gap: 12px;
}
@media (max-width: 768px) {
  .dashboard-container {
    margin-left: 0;
    padding: 12px;
  }
  .charts-row {
    flex-direction: column;
  }
  .stats-cards {
    flex-direction: column;
  }
}
</style>
