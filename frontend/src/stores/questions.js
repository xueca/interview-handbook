import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getList } from '../api/questions'

export const useQuestionsStore = defineStore('questions', () => {
  const list = ref([])
  const total = ref(0)
  const loading = ref(false)

  async function fetchList(params = {}) {
    loading.value = true
    try {
      const res = await getList(params)
      list.value = res.list
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  return { list, total, loading, fetchList }
})
