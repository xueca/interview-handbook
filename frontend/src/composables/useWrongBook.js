import { ref, computed } from 'vue'
import { getWrong, getMarks, toggleMark } from '../api/records'
import { ElMessage } from 'element-plus'

// 难度映射
const diffMap = { easy: '简单', medium: '中等', hard: '困难' }
const diffColor = { easy: 'success', medium: 'warning', hard: 'danger' }

export default function useWrongBook() {
  const wrongList = ref([])
  const loading = ref(false)
  const expandedId = ref(null)

  // 用户标记的题目ID集合
  const markedIds = ref(new Set())

  // 筛选条件
  const filter = ref({
    category: '',
    difficulty: '',
    keyword: '',
    onlyMarked: false
  })

  // 批量选中（用于重答）
  const selectedIds = ref(new Set())

  // 分类选项（从错题列表动态提取）
  const categories = computed(() => {
    const set = new Set(wrongList.value.map(q => q.category))
    return [...set]
  })

  // 筛选后的列表
  const filteredList = computed(() => {
    return wrongList.value.filter(q => {
      if (filter.value.category && q.category !== filter.value.category) return false
      if (filter.value.difficulty && q.difficulty !== filter.value.difficulty) return false
      if (filter.value.keyword && !q.title.includes(filter.value.keyword)) return false
      if (filter.value.onlyMarked && !markedIds.value.has(q.id)) return false
      return true
    })
  })

  async function loadWrong() {
    loading.value = true
    try {
      const [wrongRes, marksRes] = await Promise.all([getWrong(), getMarks()])
      wrongList.value = wrongRes.list || []
      markedIds.value = new Set(marksRes.list || [])
    } finally {
      loading.value = false
    }
  }

  async function handleToggleMark(questionId) {
    const isMarked = !markedIds.value.has(questionId)
    try {
      await toggleMark({ questionId, isMarked })
      if (isMarked) {
        markedIds.value.add(questionId)
      } else {
        markedIds.value.delete(questionId)
      }
    } catch (e) {
      ElMessage.error('标记失败')
    }
  }

  function toggleExpand(id) {
    expandedId.value = expandedId.value === id ? null : id
  }

  function toggleSelect(id) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
  }

  function selectAll() {
    const allIds = filteredList.value.map(q => q.id)
    const allSelected = allIds.every(id => selectedIds.value.has(id))
    if (allSelected) {
      allIds.forEach(id => selectedIds.value.delete(id))
    } else {
      allIds.forEach(id => selectedIds.value.add(id))
    }
  }

  function clearFilter() {
    filter.value = { category: '', difficulty: '', keyword: '', onlyMarked: false }
  }

  return {
    wrongList, loading, expandedId, markedIds,
    filter, selectedIds, categories, filteredList,
    diffMap, diffColor,
    loadWrong, handleToggleMark, toggleExpand, toggleSelect, selectAll, clearFilter
  }
}
