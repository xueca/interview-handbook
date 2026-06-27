<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import useTimer from '../composables/useTimer'
import useQuiz from '../composables/useQuiz'
import { formatSeconds } from '../utils/stats'

const router = useRouter()
const route = useRoute()
const INITIAL_SECONDS = 180
const timer = useTimer(INITIAL_SECONDS)
const {
  questions, currentIndex, userAnswers, submitted, result, ccMap,
  currentQuestion, answeredCount, isSelected, isAnswered,
  handleSelect, prevQuestion, nextQuestion, jumpTo,
  handleSubmit, loadQuestions, retry
} = useQuiz(INITIAL_SECONDS)

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const diffMap = { easy: '简单', medium: '中等', hard: '困难' }
const diffColor = { easy: 'success', medium: 'warning', hard: 'danger' }
const expandedId = ref(null)

// 从错题本进来时返回错题本，否则返回题库
function goBack() { timer.stop(); router.push(route.query.from === 'wrong-book' ? '/wrong-book' : '/question-bank') }
function onSubmit(force = false) { timer.stop(); handleSubmit(force, timer.remainingSeconds.value) }
function toggleExpand(id) { expandedId.value = expandedId.value === id ? null : id }
function onRetry() { timer.reset(INITIAL_SECONDS); timer.start(); retry() }

watch(() => timer.isTimeout.value, (v) => { if (v) onSubmit(true) })

// 键盘快捷键: ←→ 切题, ↑↓ 滚动选项, 数字键 1-N 直接选; 已提交或焦点在输入框时不响应
function handleKeydown(e) {
  if (submitted.value || !currentQuestion.value) return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  const optLen = currentQuestion.value.options.length
  const qid = currentQuestion.value.id
  if (e.key === 'ArrowLeft') { e.preventDefault(); prevQuestion() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); nextQuestion() }
  else if (e.key === 'ArrowDown') {
    e.preventDefault()
    const cur = userAnswers.value[qid]?.[0]
    // 到底时取模回绕到第一个选项 A
    handleSelect(cur === undefined ? 0 : (cur + 1) % optLen)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const cur = userAnswers.value[qid]?.[0]
    // 到顶时加 optLen 再取模，回绕到最后一个选项 D
    handleSelect(cur === undefined ? optLen - 1 : (cur - 1 + optLen) % optLen)
  } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
    const idx = parseInt(e.key) - 1
    if (idx < optLen) { e.preventDefault(); handleSelect(idx) }
  }
  // Enter 确认当前选项并前进下一题；最后一题时 nextQuestion 内部有边界保护不越界
  else if (e.key === 'Enter') { e.preventDefault(); nextQuestion() }
}

onMounted(async () => {
  await loadQuestions()
  if (questions.value.length > 0) timer.start()
  else { ElMessage.error('没有可答题的题目'); router.push('/question-bank') }
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <!-- 结果展示 -->
  <div class="quiz-page" v-if="submitted && result">
    <el-card class="result-card">
      <h2>答题结果</h2>
      <div class="result-score">{{ result.correct }}/{{ result.total }}<span class="result-pct">（{{ result.score }}%）</span></div>
      <el-row :gutter="20" class="result-stats">
        <el-col :span="8"><el-statistic title="正确" :value="result.correct" /></el-col>
        <el-col :span="8"><el-statistic title="总题" :value="result.total" /></el-col>
        <el-col :span="8"><el-statistic title="用时" :value="formatSeconds(result.timeUsed)" /></el-col>
      </el-row>
      <div class="result-details">
        <div v-for="d in result.details" :key="d.questionId" class="detail-item" :class="{ correct: d.isCorrect, wrong: !d.isCorrect }">
          <div class="detail-header" @click="toggleExpand(d.questionId)">
            <span class="detail-icon">{{ d.isCorrect ? '✅' : '❌' }}</span>
            <span class="detail-title">{{ d.title }}</span>
            <span class="detail-answers">你的: {{ d.userAnswer || '未答' }} | 正确: {{ d.correctAnswer }}</span>
            <span v-if="ccMap[d.questionId] !== undefined" class="cc-badge" :class="ccMap[d.questionId] >= 3 ? 'mastered' : ''">
              {{ ccMap[d.questionId] >= 3 ? '已掌握' : `连续答对 ${ccMap[d.questionId]}/3` }}
            </span>
          </div>
          <div v-if="expandedId === d.questionId" class="detail-analysis">
            <p v-if="d.options"><strong>选项：</strong></p>
            <p v-for="(opt, i) in d.options" :key="i" class="analysis-option">{{ LABELS[i] }}. {{ opt }}</p>
            <p class="analysis-text"><strong>解析：</strong>{{ d.analysis }}</p>
          </div>
        </div>
      </div>
      <div class="result-actions">
        <el-button type="primary" @click="onRetry">再来一次</el-button>
        <el-button @click="goBack">返回题库</el-button>
      </div>
    </el-card>
  </div>

  <!-- 答题界面 -->
  <div class="quiz-page" v-else-if="currentQuestion">
    <div class="quiz-header">
      <div class="header-left">
        <el-button text @click="goBack">← 返回题库</el-button>
        <span class="progress">第 {{ currentIndex + 1 }} / {{ questions.length }} 题</span>
        <el-tag size="small" :type="diffColor[currentQuestion.difficulty]">{{ diffMap[currentQuestion.difficulty] }}</el-tag>
        <el-tag size="small">{{ currentQuestion.category }}</el-tag>
      </div>
      <span class="timer" :class="{ timeout: timer.isTimeout.value }">{{ timer.formattedTime.value }}</span>
    </div>
    <div class="quiz-body">
      <div class="question-area">
        <h3 class="question-title">{{ currentQuestion.title }}</h3>
        <pre v-if="currentQuestion.code" class="question-code">{{ currentQuestion.code }}</pre>
        <div class="options-list">
          <div v-for="(opt, idx) in currentQuestion.options" :key="idx"
            class="option-item" :class="{ selected: isSelected(idx) }" @click="handleSelect(idx)">
            <span class="option-label">{{ LABELS[idx] }}</span>
            <span class="option-text">{{ opt }}</span>
          </div>
        </div>
      </div>
      <div class="answer-card">
        <h4>答题卡</h4>
        <p class="answered-info">已答 {{ answeredCount }} / {{ questions.length }}</p>
        <div class="card-grid">
          <span v-for="(_, idx) in questions" :key="idx" class="card-item"
            :class="{ current: idx === currentIndex, answered: isAnswered(questions[idx]?.id) }"
            @click="jumpTo(idx)">{{ idx + 1 }}</span>
        </div>
      </div>
    </div>
    <div class="quiz-footer">
      <el-button :disabled="currentIndex === 0" @click="prevQuestion">上一题</el-button>
      <el-button :disabled="currentIndex === questions.length - 1" @click="nextQuestion">下一题</el-button>
      <el-button type="primary" @click="onSubmit(false)">提交</el-button>
    </div>
    <!-- 键盘快捷键提示 -->
    <div class="keyboard-hint">← → 切换题目 &nbsp;|&nbsp; ↑↓ 滚动选项 &nbsp;|&nbsp; 1-{{ currentQuestion?.options?.length }} 选择选项 &nbsp;|&nbsp; Enter 下一题</div>
  </div>
  <div v-else class="quiz-loading"><el-empty description="加载题目中..." /></div>
</template>

<style scoped>
.quiz-page { max-width: 960px; margin: 0 auto; }
.quiz-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #ebeef5; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.progress { font-size: 15px; color: #303133; font-weight: 500; }
.timer { font-size: 20px; font-weight: bold; color: #409eff; font-variant-numeric: tabular-nums; }
.timer.timeout { color: #f56c6c; }
.quiz-body { display: flex; gap: 24px; }
.question-area { flex: 1; }
.question-title { font-size: 17px; color: #303133; line-height: 1.7; margin: 0 0 12px 0; }
.question-code { background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 4px; padding: 12px 16px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6; color: #303133; margin: 0 0 20px 0; overflow-x: auto; white-space: pre; }
.options-list { display: flex; flex-direction: column; gap: 12px; }
.option-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1px solid #dcdfe6; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.option-item:hover { border-color: #409eff; background: #ecf5ff; }
.option-item.selected { border-color: #409eff; background: #409eff; color: #fff; }
.option-item.selected .option-label { background: #fff; color: #409eff; }
.option-label { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #f0f2f5; color: #606266; font-size: 14px; font-weight: 500; flex-shrink: 0; }
.option-text { font-size: 15px; line-height: 28px; }
.answer-card { width: 200px; flex-shrink: 0; background: #fafafa; border-radius: 8px; padding: 16px; }
.answer-card h4 { margin: 0 0 8px 0; font-size: 15px; color: #303133; }
.answered-info { font-size: 13px; color: #909399; margin: 0 0 12px 0; }
.card-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.card-item { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 4px; font-size: 13px; cursor: pointer; background: #fff; border: 1px solid #dcdfe6; color: #606266; transition: all 0.15s; }
.card-item:hover { border-color: #409eff; color: #409eff; }
.card-item.current { border-color: #409eff; background: #409eff; color: #fff; }
.card-item.answered { background: #e6f7ff; border-color: #91d5ff; color: #1890ff; }
.quiz-footer { display: flex; justify-content: center; gap: 16px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #ebeef5; }
.keyboard-hint { text-align: center; margin-top: 12px; font-size: 12px; color: #c0c4cc; }
.quiz-loading { text-align: center; margin-top: 120px; }
.result-card { text-align: center; margin-top: 40px; }
.result-card h2 { margin: 0 0 16px 0; color: #303133; }
.result-score { font-size: 48px; font-weight: bold; color: #409eff; }
.result-pct { font-size: 20px; color: #909399; margin-left: 4px; }
.result-stats { margin: 24px 0; }
.result-details { text-align: left; max-height: 400px; overflow-y: auto; }
.detail-item { border-radius: 6px; margin-bottom: 8px; overflow: hidden; }
.detail-item.correct { background: #f0f9eb; }
.detail-item.wrong { background: #fef0f0; }
.detail-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; font-size: 14px; }
.detail-icon { flex-shrink: 0; }
.detail-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-answers { flex-shrink: 0; color: #909399; font-size: 13px; }
.detail-analysis { padding: 8px 12px 12px 36px; border-top: 1px solid rgba(0,0,0,0.05); font-size: 14px; line-height: 1.6; }
.analysis-option { margin: 2px 0; color: #606266; }
.analysis-text { margin-top: 8px; color: #303133; }
.result-actions { margin-top: 24px; display: flex; justify-content: center; gap: 12px; }
.cc-badge { flex-shrink: 0; font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #e6f7ff; color: #1890ff; }
.cc-badge.mastered { background: #f0f9eb; color: #67c23a; }
</style>
