import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQuestionsStore } from '../stores/questions'
import { removeQuestion } from '../api/questions'
import { CATEGORIES } from '../constants/categories'

// 防止关键词输入时频繁请求: 延迟 delay 毫秒后才执行真正的过滤
function debounce(fn, delay) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function useQuestionBank() {
  const router = useRouter()
  const store = useQuestionsStore()

  const categories = CATEGORIES
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

  // 关键词搜索防抖版: 输入停止 300ms 后才触发筛选, 减少无谓请求
  const handleFilterDebounced = debounce(handleFilter, 300)

  function handlePageChange(page) {
    currentPage.value = page
  }

  function goToQuiz(question) {
    router.push({
      path: `/question/${question.id}`,
    })
  }

  function startQuiz() {
    if (store.list.length === 0) return
    const ids = store.list.map(q => q.id).join(',')
    const category = filter.value.category || ''
    router.push({ path: '/quiz', query: { ids, category, mode: 'exam' } })
  }

  const displayList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return store.list.slice(start, start + pageSize.value)
  })

  // 删除题目: 二次确认 → 调 DELETE 接口 → 刷新列表
  // 注意: ElMessageBox.confirm 取消时会 reject('cancel'), 用 catch 静默吞掉
  async function handleDelete(question) {
    try {
      await ElMessageBox.confirm(
        `确认删除题目 #${question.id}「${question.title.slice(0, 20)}…」？此操作不可恢复。`,
        '删除确认',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
    } catch {
      return  // 用户取消
    }
    try {
      await removeQuestion(question.id)
      ElMessage.success('题目已删除')
      // 删除后若当前页变空, 回退到上一页, 避免空白页
      const lastPage = Math.max(1, Math.ceil((store.list.length - 1) / pageSize.value))
      if (currentPage.value > lastPage) currentPage.value = lastPage
      await loadData()
    } catch {
      // request.js 拦截器已弹 ElMessage.error, 这里不重复
    }
  }

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
    handleFilterDebounced,
    handlePageChange,
    goToQuiz,
    startQuiz,
    handleDelete,
    displayList,
  }
}
