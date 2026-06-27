<script setup>
import { onMounted, onUnmounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { useUserStore } from '../stores/user'
import { useRecordStore } from '../stores/record'
import { useDarkMode } from '../composables/useDarkMode'

const router = useRouter()
const userStore = useUserStore()
const recordStore = useRecordStore()
const { isDark } = useDarkMode()
// storeToRefs 保留 ref 身份，模板自动解包，script 里用 .value
const { stats } = storeToRefs(recordStore)

// stats 是 Ref，script 上下文需要 .value
const correctRate = computed(() =>
  stats.value.totalQuestions ? Math.round((stats.value.totalCorrect / stats.value.totalQuestions) * 100) : 0
)

// 暗黑模式下的ECharts配色
const darkColors = computed(() => ({
  text: isDark.value ? '#cfd3dc' : '#333',
  subText: isDark.value ? '#a3a6ad' : '#aaa',
  axisLine: isDark.value ? '#4c4d4f' : '#ccc',
  splitLine: isDark.value ? '#333' : '#eee',
  areaOpacity: isDark.value ? 0.08 : 0.15,
}))

let lineChart = null, barChart = null, pieChart = null, resizeTimer = null

// 每日正确率折线图
function initLineChart() {
  const el = document.getElementById('line-chart')
  if (!el) return
  lineChart = echarts.init(el)
  lineChart.setOption({
    title: { text: '每日正确率趋势', left: 'center', textStyle: { fontSize: 14, color: darkColors.value.text } },
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    xAxis: { type: 'category', data: stats.value.dailyTrend.map(d => d.date.slice(5)), axisLine: { lineStyle: { color: darkColors.value.axisLine } }, axisLabel: { color: darkColors.value.subText } },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: darkColors.value.subText }, splitLine: { lineStyle: { color: darkColors.value.splitLine } } },
    series: [{ type: 'line', data: stats.value.dailyTrend.map(d => d.rate), smooth: true, areaStyle: { opacity: darkColors.value.areaOpacity }, itemStyle: { color: '#409eff' } }],
    grid: { left: 40, right: 20, top: 40, bottom: 20 }
  })
}

// 分类正确率柱状图
function initBarChart() {
  const el = document.getElementById('bar-chart')
  if (!el) return
  barChart = echarts.init(el)
  barChart.setOption({
    title: { text: '分类正确率', left: 'center', textStyle: { fontSize: 14, color: darkColors.value.text } },
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    xAxis: { type: 'category', data: stats.value.categoryStats.map(c => c.category), axisLine: { lineStyle: { color: darkColors.value.axisLine } }, axisLabel: { color: darkColors.value.subText } },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: darkColors.value.subText }, splitLine: { lineStyle: { color: darkColors.value.splitLine } } },
    series: [{ type: 'bar', data: stats.value.categoryStats.map(c => c.rate), itemStyle: { color: '#67c23a' }, barWidth: '40%' }],
    grid: { left: 40, right: 20, top: 40, bottom: 20 }
  })
}

// 薄弱知识点饼图
function initPieChart() {
  const el = document.getElementById('pie-chart')
  if (!el) return
  pieChart = echarts.init(el)
  pieChart.setOption({
    title: { text: '薄弱知识点', left: 'center', textStyle: { fontSize: 14, color: darkColors.value.text } },
    tooltip: { trigger: 'item', formatter: '{b}: {c}题 ({d}%)' },
    series: [{ type: 'pie', radius: ['35%', '65%'], data: stats.value.weakTopics.map(w => ({ name: w.topic, value: w.wrongCount })), label: { color: darkColors.value.subText, formatter: '{b}\n{d}%' } }],
    color: ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#909399']
  })
}

// dispose + 重建合一：先销毁旧实例再重建，使此函数可安全重复调用（暗黑切换 / 未来数据刷新）
function initCharts() {
  lineChart?.dispose(); barChart?.dispose(); pieChart?.dispose()
  lineChart = null; barChart = null; pieChart = null
  initLineChart(); initBarChart(); initPieChart()
}

// 防抖 150ms：拖动窗口时高频触发，只在停止后执行一次 canvas 重排，避免无效的 ECharts resize
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { lineChart?.resize(); barChart?.resize(); pieChart?.resize() }, 150)
}

onMounted(async () => {
  await recordStore.fetchStats()
  initCharts()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
  lineChart?.dispose(); barChart?.dispose(); pieChart?.dispose()
})

// 暗黑切换：直接复用 initCharts（已内置 dispose），无需重复写销毁逻辑
watch(isDark, initCharts)

// 统计数据加载失败时给出提示, 避免页面静默空白
watch(() => recordStore.error, (val) => {
  if (val) ElMessage.error('统计数据加载失败，请刷新重试')
})
</script>

<template>
  <div class="dashboard" v-loading="recordStore.loading">
    <h2>欢迎，{{ userStore.userInfo?.username || '用户' }}！</h2>
    <!-- 数据卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="总答题数" :value="stats.totalQuestions" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="正确率" :value="correctRate" suffix="%" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="平均分" :value="stats.avgScore" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="答题次数" :value="stats.totalQuizzes" />
        </el-card>
      </el-col>
    </el-row>
    <!-- 快速开始 -->
    <el-card shadow="hover" class="quick-start">
      <div class="quick-start-content">
        <div>
          <h3>今日快速开始</h3>
          <p>继续刷题，保持手感！</p>
        </div>
        <el-button type="primary" size="large" @click="router.push('/question-bank')">前往题库</el-button>
      </div>
    </el-card>
    <!-- 图表 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover"><div id="line-chart" class="chart-box" /></el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover"><div id="bar-chart" class="chart-box" /></el-card>
      </el-col>
    </el-row>
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover"><div id="pie-chart" class="chart-box" /></el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="weak-list-card">
          <h4>薄弱知识点详情</h4>
          <div v-if="stats.weakTopics.length === 0" class="empty-tip">暂无薄弱项，继续保持！</div>
          <div v-for="(w, i) in stats.weakTopics" :key="i" class="weak-item">
            <span class="weak-rank">{{ i + 1 }}</span>
            <span class="weak-topic">{{ w.topic }}</span>
            <el-tag type="danger" size="small">错{{ w.wrongCount }}题</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard { max-width: 1100px; margin: 0 auto; }
.dashboard h2 { margin: 0 0 20px 0; font-size: 22px; color: #303133; }
.stat-cards { margin-bottom: 20px; }
.stat-card { text-align: center; }
.quick-start { margin-bottom: 20px; }
.quick-start-content { display: flex; justify-content: space-between; align-items: center; }
.quick-start-content h3 { margin: 0 0 4px 0; font-size: 16px; color: #303133; }
.quick-start-content p { margin: 0; color: #909399; font-size: 14px; }
.chart-row { margin-bottom: 16px; }
.chart-box { height: 280px; }
.weak-list-card { height: 312px; }
.weak-list-card h4 { margin: 0 0 12px 0; font-size: 15px; color: #303133; }
.empty-tip { text-align: center; color: #909399; padding: 40px 0; font-size: 14px; }
.weak-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f2f5; }
.weak-rank { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #fef0f0; color: #f56c6c; font-size: 12px; font-weight: 600; }
.weak-topic { flex: 1; font-size: 14px; color: #303133; }
</style>
