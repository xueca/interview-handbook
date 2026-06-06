import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuestionsStore } from '../stores/questions'

export default function useQuestionBank() {
  const router = useRouter()
  const store = useQuestionsStore()

  const categories = ['JavaScript', 'Vue', 'CSS', '网络', '浏览器', '工程化']
  const difficulties = [
    { label: '简单', value: 'easy' },
    { label: '中等', value: 'medium' },
    { label: '困难', value: 'hard' },
  ]
  const difficultyMap = { easy: '简单', medium: '中等', hard: '困难' }
  const difficultyColor = { easy: 'success', medium: 'warning', hard: 'danger' }

  const filter = ref({ category: '', difficulty: '', keyword: '' })
  const currentPage = ref(1)
  const pageSize = ref(10)

  function buildParams() {
    const params = {}
    if (filter.value.category) params.category = filter.value.category
    if (filter.value.difficulty) params.difficulty = filter.value.difficulty
    if (filter.value.keyword) params.keyword = filter.value.keyword
    return params
  }

  async function loadData() {
    await store.fetchList(buildParams())
  }

  function handleFilter() {
    currentPage.value = 1
    loadData()
  }

  function handlePageChange(page) {
    currentPage.value = page
  }

  function goToQuiz(question) {
    router.push({
      path: '/quiz',
      query: { id: question.id, category: question.category },
    })
  }

  function startQuiz() {
    if (store.list.length === 0) return
    const ids = store.list.map(q => q.id).join(',')
    const category = filter.value.category || ''
    router.push({ path: '/quiz', query: { ids, category } })
  }

  const displayList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return store.list.slice(start, start + pageSize.value)
  })

  return {
    store,
    categories,
    difficulties,
    filter,
    currentPage,
    pageSize,
    difficultyMap,
    difficultyColor,
    loadData,
    handleFilter,
    handlePageChange,
    goToQuiz,
    startQuiz,
    displayList,
  }
}
