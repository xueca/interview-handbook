import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getStats as getStatsApi } from '../api/records'

export const useRecordStore = defineStore('record', () => {
  const stats = ref({
    totalQuizzes: 0, avgScore: 0, totalQuestions: 0, totalCorrect: 0,
    dailyTrend: [], categoryStats: [], weakTopics: []
  })
  const loading = ref(false)

  async function fetchStats() {
    loading.value = true
    try {
      stats.value = await getStatsApi()
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, fetchStats }
})
