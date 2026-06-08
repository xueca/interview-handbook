<script setup>
defineProps({
  question: { type: Object, required: true }
})
defineEmits(['addToBank'])

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const diffMap = { easy: '简单', medium: '中等', hard: '困难' }
const diffColor = { easy: 'success', medium: 'warning', hard: 'danger' }
</script>

<template>
  <div class="ai-question-card">
    <div class="q-header">
      <el-tag :type="diffColor[question.difficulty]" size="small">{{ diffMap[question.difficulty] }}</el-tag>
      <el-tag size="small">{{ question.category }}</el-tag>
    </div>
    <div class="q-title">{{ question.title }}</div>
    <div v-if="question.code" class="q-code"><pre>{{ question.code }}</pre></div>
    <div class="q-options">
      <div v-for="(opt, i) in question.options" :key="i" class="q-option">
        <span class="opt-label" :class="{ correct: i === question.answer }">{{ LABELS[i] }}</span>
        <span class="opt-text">{{ opt }}</span>
      </div>
    </div>
    <div class="q-answer"><strong>正确答案：</strong>{{ LABELS[question.answer] }}</div>
    <div class="q-analysis"><strong>解析：</strong>{{ question.analysis }}</div>
    <el-button type="primary" size="small" @click="$emit('addToBank')">加入题库</el-button>
  </div>
</template>

<style scoped>
/* 使用 Element Plus 变量，暗黑模式自动切换背景色 */
.ai-question-card { padding: 12px; border: 1px solid #e4e7ed; border-radius: 8px; background: var(--el-bg-color); }
.q-header { display: flex; gap: 8px; margin-bottom: 8px; }
.q-title { font-weight: 500; margin-bottom: 12px; line-height: 1.6; }
.q-code pre { background: #f5f7fa; padding: 8px; border-radius: 4px; font-size: 13px; overflow-x: auto; }
.q-options { margin-bottom: 12px; }
.q-option { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.opt-label { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f4f4f5; font-size: 12px; }
.opt-label.correct { background: #67c23a; color: #fff; }
.q-answer, .q-analysis { margin-bottom: 8px; font-size: 13px; color: #606266; }
</style>
