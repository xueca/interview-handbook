import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getStats as getStatsApi } from '../api/records'

export const useRecordStore = defineStore('record', () => {
  const stats = ref({
    totalQuizzes: 0, avgScore: 0, totalQuestions: 0, totalCorrect: 0,
    dailyTrend: [], categoryStats: [], weakTopics: []
  })
  const loading = ref(false)
  // 统计数据加载失败时存放错误信息，供视图层 watch 后弹 Toast，避免静默失败
  const error = ref(null)

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      stats.value = await getStatsApi()
    } catch (e) {
      error.value = e?.message || '数据加载失败'
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, fetchStats }
})
