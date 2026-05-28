<template>
<div class="quiz-container">
    <div class="quiz-main">
          <!-- 主内容区 -->
      <div class="quiz-header">
        <span class="back-link" @click="router.push('/questions')">← 返回题库</span>
        <span >第 {{ currentIndex + 1 }}/{{ questions.length }} 题</span>
        <span  class="time-tag">时间：{{ timer.formattedTime }}</span>
      </div>     
      <!-- 中间：题目内容 -->
       <div class="quiz-content">
         <div v-if="questions.length === 0" class="loading-state">
            加载中...
         </div>
         <div v-else-if="currentQuestion">
            <div class="question-tags">
                <el-tag type="info">{{ typeMap[currentQuestion.type] }}</el-tag>
                <el-tag type="info">{{ currentQuestion.category }}</el-tag>
                <el-tag :type="difficultyColorMap[currentQuestion.difficulty]">{{ difficultyMap[currentQuestion.difficulty] }}</el-tag>
            </div>
            <div class="question-title" v-html="formattedTitle(currentQuestion.title)"></div>
            <div class="option-list">
                <div v-for="(option,index) in currentQuestion.options" :key="index" class="option-item"
                :class="{'selected':isSelected(index)}" @click="handleSelect(index)" >
                <span >{{ optionLabels[index] }}</span>
                <span v-html="formatOption(option)"> </span>
                </div>

            </div>
         </div>
    </div>
    <div class="quiz-footer">
        <el-button type="primary" @click="prevQuestion" :disabled="currentIndex === 0">上一题</el-button>
        <el-button v-if="currentIndex < questions.length - 1" @click="nextQuestion">下一题</el-button>
        <el-button type="primary" @click="handleSubmit" >提交</el-button>

    </div>
</div>    
<!-- 侧边栏区 -->
    <div class="quiz-sidebar">      
        <el-card class="answer-card">
            <template #header>
                <span>答题卡</span>
            </template>
            <p>已答：{{ answeredCount }}/{{ questions.length }}</p>
            <div class="card-grid">
               <button
                 v-for="(q,index) in questions"
                 :key="q.id"
                 class="card-item"
                 :class="{
                    answered:isAnswered(q.id),
                    current: index === currentIndex
                }"
                @click="jumpTo(index)"
                >
                    {{ index + 1}}
                </button>
            </div>
        </el-card>
    </div>
</div>
</template>


<script setup>
import { ref, onMounted,computed,onUnmounted,watch } from 'vue'
import { useRoute , useRouter  } from 'vue-router'
import {marked} from 'marked'
import useTimer from '../utils/timer'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useQuestionsStore } from '../stores/questions'
const route = useRoute()
const router = useRouter()
// 题目数据
const questions = ref([])
// 选项标签
const optionLabels = ['A','B','C','D','E','F']
//类型和难度映射
const typeMap = {
    multiple: '多选题',
    single: '单选题',
}
const difficultyMap = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
}
//颜色和难度的映射
const difficultyColorMap = {
    easy: 'info',
    medium: 'warning',
    hard: 'danger',
}
// 当前题目索引（默认第1题）
const currentIndex = ref(0)
// 用户答案记录 { 题目id: [选中选项的索引] }
const userAnswers = ref({})
// 计时器（总时长180秒 = 3分钟）
const timer = useTimer(180)
//当前题目
const currentQuestion = computed(() => {
    return questions.value[currentIndex.value]
})
//已答题目数量
const answeredCount = computed(() => {
    return Object.keys(userAnswers.value).length
})
// 格式化题目标题（仅处理字符串）
function formattedTitle(title) {
  if (!title || typeof title !== 'string') {
    return ''
  }
  return marked(title)
}
// 格式化选项：支持字符串或 {key, text} 对象格式
function formatOption(option) {
  if (!option) return ''
  // 选项是对象格式 { key: "A", text: "Alice" }
  if (typeof option === 'object' && option.text) {
    return marked(option.text)
  }
  // 选项是纯字符串
  if (typeof option === 'string') {
    return marked(option)
  }
  return ''
}
//检查某个项目是否被选中
function isSelected(index){
  const qid = currentQuestion.value?.id
  return userAnswers.value[qid]?.includes(index) || false
}

//点击选项的处理
function handleSelect(index){
   const qid = currentQuestion.value?.id
   if(!qid) return
   if(!userAnswers.value[qid]){
    userAnswers.value[qid] = []
   }
   const current = userAnswers.value[qid]
   if(currentQuestion.value.type === 'multiple'){
    //多选题：切换选中状态
    const idx = current.indexOf(index)
    idx > -1 ? current.splice(idx,1) : current.push(index)
   }else{
    //单选题：替换为当前选项
    userAnswers.value[qid] = [index]
   }
}
//上一题
function prevQuestion(){
    if (currentIndex.value > 0) {
        currentIndex.value--
        
    }
  
}
//下一题
function nextQuestion(){
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++
        
    }
  
}
//答题卡
// 监听计时器时间，时间到自动提交
watch(() => timer.isTimeout.value, (isTimeout) => {
    if (isTimeout) {
        ElMessage.warning('答题时间已到，自动提交答案')
        calculateAndSubmit()
    }
})
//检查某题是否已答
function isAnswered(questionId){
    return userAnswers.value[questionId]?.length 
}
//点击答题卡跳转到指定题
function jumpTo(index){
    currentIndex.value = index
    
}
//提交答案
function handleSubmit() {
  const total = questions.value.length
  const answered = answeredCount.value

  if (answered < total) {
    ElMessageBox.confirm('有题目未回答，确认提交吗？', '提示', {
      confirmButtonText: '提交',
      cancelButtonText: '答题',
      type: 'warning'
    }).then(() => {
      // 用户确认提交，计算得分并跳转
      calculateAndSubmit()
    }).catch(() => {
      // 用户点击了"答题"
      currentIndex.value = 0
      //不重置计时器，延续计时
    })
  } else {
    // 全部答完，直接计算得分并跳转
    calculateAndSubmit()
  }
}

// 计算得分并提交
function calculateAndSubmit() {
  let correctCount = 0
  
  questions.value.forEach(q => {
    const userAnswer = userAnswers.value[q.id]
    if (!userAnswer || userAnswer.length === 0) return
    
    // 多选题需要全部选对才算正确
    if (q.type === 'multiple') {
      // 将用户答案索引转换为字母
      const userLetters = userAnswer.map(idx => optionLabels[idx]).sort()
      // 正确答案可能是多个，如 "AB"
      const correctLetters = q.answer.split('').sort()
      
      if (userLetters.join('') === correctLetters.join('')) {
        correctCount++
      }
    } else {
      // 单选题
      const userLetter = optionLabels[userAnswer[0]]
      if (userLetter === q.answer) {
        correctCount++
      }
    }
  })
  
  const score = Math.round((correctCount / questions.value.length) * 100)
  
  // 构造结果数据
  const result = {
    score,
    correctCount,
    answeredCount: answeredCount.value,
    totalCount: questions.value.length,
    userAnswers: userAnswers.value,
    questions: questions.value
  }
  
  // 跳转到结果页，通过 URL 参数传递数据
  router.push({
    path: '/quiz/result',
    query: { result: encodeURIComponent(JSON.stringify(result)) }
  })
}
onMounted(async () => {
    // 开始计时
    // 加载题目数据
    const questionsStore = useQuestionsStore()
    await questionsStore.fetchlist({
        type: '',
        category: route.query.category || '',
        difficulty: 'medium',
        num: 10
    })
    questions.value = questionsStore.list
    timer.startTimer()

})
onUnmounted(() => {
   //清理计时器
   timer.cleanup()
})
</script>

<style scoped>
.quiz-container {
  display: flex;
  gap: 0;
  height: 100vh;
  width: calc(100vw - 220px);
  position: fixed;
  left: 220px;
  top: 0;
  padding: 0;
  background: #f5f7fa;
  box-sizing: border-box;
}
.quiz-header{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding:16px 24px;
  color: white;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  margin-bottom: 0;
}
.quiz-header span:first-child{
  font-size: 14px;
  cursor: pointer;
  opacity: 0.85;
}
.quiz-header span:first-child:hover{
  opacity: 1;
}
.back-link{
  font-size: 14px !important;
}
.quiz-header span:last-child{
  font-size: 20px;
  font-weight: bold;
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
}
.quiz-content{
  flex: 1;
  display: flex;
}
.quiz-content > div{
  width: 100%;
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
.question-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.question-tags .el-tag:nth-child(1) {
  background: #e8f5e9;
  color: #2e7d32;
  border: none;
}

.question-tags .el-tag:nth-child(2) {
  background: #e3f2fd;
  color: #1976d2;
  border: none;
}

.question-tags .el-tag:nth-child(3) {
  border: none;
  color: white;
}

.question-tags .el-tag:nth-child(3).el-tag--info {
  background: #4caf50;
}

.question-tags .el-tag:nth-child(3).el-tag--warning.el-tag--light {
  color: #000000;
}
.quiz-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;  /* 保留一点内边距让内容不贴边 */
}
.quiz-sidebar {
  /*width: 220px;
  flex-shrink: 0;
  padding: 20px 20px 20px 0;  /* 左边不加padding，因为要去掉gap */
  width: 440px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.option-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.option-item:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.option-item.selected {
  border-color: #667eea;
  background: #f0f4ff;
}

.option-item span:first-child {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #667eea;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.option-item.selected span:first-child {
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.option-item span:last-child {
  color: #000000;
  font-size: 14px;
}
.quiz-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.quiz-footer .el-button:last-child {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  border: none;
  color: white;
}

.quiz-footer .el-button:last-child:hover {
  opacity: 0.9;
}

.quiz-footer .el-button:first-child {
  background: #f5f5f5;
  border-color: #e0e0e0;
  color: #666;
}
.quiz-sidebar .el-card {
  border-radius: 12px;
  flex-shrink: 0;
}

.quiz-sidebar .el-card p {
  color: #666;
  font-size: 14px;
  margin: 0 0 16px 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.card-item {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-item:hover {
  border-color: #667eea;
}

.card-item.current {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.card-item.answered {
  background: #e8f5e9;
  border-color: #4caf50;
}

.card-item.answered.current {
  background: #4caf50;
  color: white;
}
</style>
