import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useRecordStore = defineStore('record', () => {
     // state：存最近一次答题结果
    const lastQuizResult = ref(null) 
    // action：保存答题结果
    function saveQuizResult(result) {
        lastQuizResult.value = result
    }
    const stats = ref(null)
    async function fetchStats() {
      const { getStats } = await import('../api/records')
      const res = await getStats()
      if (res.code === 0) {
        stats.value = res.data
      }
      return res
    }
    return {
        lastQuizResult,
        saveQuizResult,
        stats,
        fetchStats
    }
})
    