import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getList, getDetail } from '../api/questions'
import { submitRecord } from '../api/records'
import { calcScore, calcTimeUsed } from '../utils/stats'
import { ElMessageBox, ElMessage } from 'element-plus'

export default function useQuiz(initialSeconds = 180) {
  const route = useRoute()
  const router = useRouter()
  const questions = ref([])
  const currentIndex = ref(0)
  const userAnswers = ref({})
  const submitted = ref(false)
  const result = ref(null)

  const currentQuestion = computed(() => questions.value[currentIndex.value])
  const answeredCount = computed(() => Object.keys(userAnswers.value).length)

  const isSelected = (index) =>
    userAnswers.value[currentQuestion.value?.id]?.includes(index) || false

  const isAnswered = (qid) =>
    userAnswers.value[qid]?.length > 0

  function handleSelect(index) {
    if (submitted.value) return
    const qid = currentQuestion.value?.id
    if (!qid) return
    const type = currentQuestion.value?.type || 'single'
    const cur = userAnswers.value[qid] || []

    if (type === 'multiple') {
      // 多选题：toggle逻辑
      if (cur.includes(index)) {
        userAnswers.value[qid] = cur.filter(i => i !== index)
      } else {
        userAnswers.value[qid] = [...cur, index]
      }
    } else {
      // 单选题/判断题：直接替换
      userAnswers.value[qid] = [index]
    }
  }

  const prevQuestion = () => {
    if (currentIndex.value > 0) currentIndex.value--
  }
  const nextQuestion = () => {
    if (currentIndex.value < questions.value.length - 1) currentIndex.value++
  }
  const jumpTo = (index) => { currentIndex.value = index }

  async function handleSubmit(force = false, remainingSeconds = 0) {
    if (!force && answeredCount.value < questions.value.length) {
      try {
        await ElMessageBox.confirm('有题目未回答，确认提交吗？', '提示', {
          confirmButtonText: '提交', cancelButtonText: '继续答题', type: 'warning'
        })
      } catch { return }
    }
    const { score, correct, total, answered, details } = calcScore(questions.value, userAnswers.value)
    const timeUsed = calcTimeUsed(initialSeconds, remainingSeconds)
    result.value = { score, correct, total, answered, timeUsed, details }
    submitted.value = true
    try {
      const category = route.query.category || questions.value[0]?.category || '未分类'
      await submitRecord({ score, correct, total, answered, timeUsed, details, category })
      ElMessage.success('答题记录已保存')
    } catch (e) {
      console.error('保存记录失败:', e)
    }
  }

  async function loadQuestions() {
    try {
      const ids = route.query.ids
      if (ids) {
        // 批量获取：ids="1,2,3" → 并行调用 getDetail
        const idList = ids.split(',').map(Number).filter(Boolean)
        const res = await Promise.all(idList.map(id => getDetail(id)))
        questions.value = res.filter(Boolean)
        return
      }
      const id = route.query.id
      if (id) {
        const res = await getDetail(id)
        questions.value = Array.isArray(res) ? res : [res]
        return
      }
      const params = {}
      if (route.query.category) params.category = route.query.category
      if (route.query.difficulty) params.difficulty = route.query.difficulty
      const res = await getList(params)
      questions.value = res.list || []
    } catch (err) {
      console.error('加载题目失败:', err)
      questions.value = []
    }
  }

  function retry() {
    questions.value.sort(() => Math.random() - 0.5)
    userAnswers.value = {}
    currentIndex.value = 0
    submitted.value = false
    result.value = null
  }

  return {
    questions, currentIndex, userAnswers, submitted, result,
    currentQuestion, answeredCount,
    isSelected, isAnswered,
    handleSelect, prevQuestion, nextQuestion, jumpTo,
    handleSubmit, loadQuestions, retry
  }
}
