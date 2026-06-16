<script setup>
// 题目详情页(学习模式): 单题展示+选择答案+提交即看解析 | 数据流: QuestionDetail.vue → useQuestionDetail.js → api/questions.js → backend
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import useQuestionDetail from '../composables/useQuestionDetail'

const router = useRouter()
const {
  question, loading, selected, submitted, isCorrect,
  LABELS, diffMap, diffColor,
  loadQuestion, handleSelect, handleSubmit, reset,
} = useQuestionDetail()

onMounted(() => { loadQuestion() })

function goBack() { router.push('/question-bank') }
function onRetry() { reset(); loadQuestion() }

const answerText = computed(() => question.value ? LABELS[question.value.answer] : '')
</script>

<template>
  <div class="question-detail" v-loading="loading">
    <!-- 顶部导航 -->
    <el-page-header @back="goBack" title="题目详情" />

    <template v-if="question">
      <!-- 题目信息 -->
      <el-card class="question-card" shadow="never">
        <div class="q-header">
          <el-tag :type="diffColor[question.difficulty]" size="small">{{ diffMap[question.difficulty] }}</el-tag>
          <el-tag size="small">{{ question.category }}</el-tag>
        </div>
        <h3 class="q-title">{{ question.title }}</h3>
        <pre v-if="question.code" class="q-code">{{ question.code }}</pre>

        <!-- 选项区 -->
        <div class="q-options">
          <div
            v-for="(opt, i) in question.options"
            :key="i"
            class="q-option"
            :class="{
              selected: selected.includes(i),
              correct: submitted && i === question.answer,
              wrong: submitted && selected.includes(i) && i !== question.answer,
            }"
            @click="handleSelect(i)"
          >
            <span class="opt-label">{{ LABELS[i] }}</span>
            <span class="opt-text">{{ opt }}</span>
          </div>
        </div>

        <!-- 操作区 -->
        <div class="q-actions">
          <el-button
            v-if="!submitted"
            type="primary"
            :disabled="selected.length === 0"
            @click="handleSubmit"
          >
            提交答案
          </el-button>
          <el-button v-else type="success" @click="onRetry">再来一题</el-button>
        </div>

        <!-- 结果区 -->
        <div v-if="submitted" class="q-result">
          <el-alert
            :type="isCorrect ? 'success' : 'error'"
            :title="isCorrect ? '回答正确！' : '回答错误'"
            :description="`正确答案：${answerText}`"
            show-icon
            :closable="false"
          />
          <div class="q-analysis">
            <strong>解析：</strong>{{ question.analysis }}
          </div>
        </div>
      </el-card>
    </template>

    <el-empty v-else-if="!loading" description="题目不存在或已删除" />
  </div>
</template>

<style scoped>
.question-detail { max-width: 720px; margin: 0 auto; }
.question-card { margin-top: 16px; }
.q-header { display: flex; gap: 8px; margin-bottom: 12px; }
.q-title { font-size: 17px; color: #303133; margin: 0 0 16px 0; line-height: 1.6; }
.q-code { background: #f5f7fa; padding: 12px; border-radius: 4px; font-size: 13px; overflow-x: auto; margin-bottom: 16px; }
.q-options { margin-bottom: 16px; }
.q-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e4e7ed; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
.q-option:hover { border-color: #409eff; background: #f5f7fa; }
.q-option.selected { border-color: #409eff; background: #ecf5ff; }
.q-option.correct { border-color: #67c23a; background: #f0f9eb; }
.q-option.wrong { border-color: #f56c6c; background: #fef0f0; }
.opt-label { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f4f4f5; font-size: 13px; font-weight: 500; }
.q-option.correct .opt-label { background: #67c23a; color: #fff; }
.q-option.wrong .opt-label { background: #f56c6c; color: #fff; }
.opt-text { font-size: 14px; color: #606266; }
.q-actions { margin-bottom: 16px; }
.q-result { margin-top: 16px; }
.q-analysis { margin-top: 12px; padding: 12px; background: #f5f7fa; border-radius: 4px; font-size: 14px; color: #606266; line-height: 1.6; }
</style>
