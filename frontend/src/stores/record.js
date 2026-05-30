import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useRecordStore = defineStore('record', () => {
     // state：存最近一次答题结果
    const lastQuizResult = ref(null) 
    // action：保存答题结果
    function saveQuizResult(result) {
        lastQuizResult.value = result
    }
    return {
        lastQuizResult,
        saveQuizResult
    }
})
    