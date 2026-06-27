// 题目详情页业务: 获取题目 / 选择答案 / 提交显示结果 | 数据流: useQuestionDetail → api/questions.js → backend
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getDetail } from '../api/questions'

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const diffMap = { easy: '简单', medium: '中等', hard: '困难' }
const diffColor = { easy: 'success', medium: 'warning', hard: 'danger' }

export default function useQuestionDetail() {
  const route = useRoute()
  const question = ref(null)
  const loading = ref(false)
  const selected = ref([])
  const submitted = ref(false)
  const isCorrect = ref(false)

  const isSingle = computed(() => question.value?.type === 'single' || question.value?.type === 'judge')

  async function loadQuestion() {
    loading.value = true
    try {
      const res = await getDetail(route.params.id)
      question.value = res
    } catch {
      // request.js 拦截器已弹错误提示
    } finally {
      loading.value = false
    }
  }

  function handleSelect(index) {
    if (submitted.value) return
    if (isSingle.value) {
      selected.value = [index]
    } else {
      const set = new Set(selected.value)
      set.has(index) ? set.delete(index) : set.add(index)
      selected.value = Array.from(set).sort((a, b) => a - b)
    }
  }

  function handleSubmit() {
    if (selected.value.length === 0) return
    const correct = question.value.answer
    isCorrect.value = isSingle.value
      ? selected.value[0] === correct
      : selected.value.length === correct.length && selected.value.every((v, i) => v === correct[i])
    submitted.value = true
  }

  function reset() {
    selected.value = []
    submitted.value = false
    isCorrect.value = false
  }

  return {
    question, loading, selected, submitted, isCorrect,
    isSingle, LABELS, diffMap, diffColor,
    loadQuestion, handleSelect, handleSubmit, reset,
  }
}
