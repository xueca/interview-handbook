<template>
  <div class="question-bank-container">
    <div class="question-bank-header">
      <h1>题库</h1>
    </div>
    <div class="question-bank-content">
      <div class="filter-area">
          <el-select v-model="category" placeholder="选择分类">
            <el-option label="全部" value="" />
            <el-option label="JavaScript" value="JavaScript" />
            <el-option label="Vue" value="Vue" />
            <el-option label="React" value="React" />
            <el-option label="CSS" value="CSS" />
            <el-option label="网络/浏览器" value="网络/浏览器" />
            <el-option label="工程化" value="工程化" />

          </el-select>
          <el-select v-model="difficulty" placeholder="选择难度">
            <el-option label="全部" value="" />
            <el-option label="easy" value="easy" />
            <el-option label="medium" value="medium" />
            <el-option label="hard" value="hard" />
          </el-select>
          <el-input v-model="keyword" placeholder="搜索题目" />
          <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>
      <router-link v-for="item in questionStore.list" :key="item.id" class="question-card" :to="{path:'/quiz',query:{category:item.category}}">
        <p class="question-id">{{ item.id }}</p>
        <div class="question-title" v-html="marked(item.title)"></div>
        <p>类型：{{ typeMap[item.type] }}</p>
        <p>分类：{{ item.category }}</p>
        <p>难度：{{ difficultyMap[item.difficulty] }}</p>
      </router-link>
    </div>

  </div>
</template>


<script setup>
//导入题库状态
import { marked } from 'marked'
import { useQuestionsStore } from '../stores/questions';
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

//获取store
const questionStore = useQuestionsStore()
//获取题库列表
questionStore.fetchlist({})
//筛选条件
const category = ref('')
const difficulty = ref('')
const keyword = ref('')
const typeMap = {
  single: '单选',multiple:'多选'
}
const difficultyMap = { easy: '简单', medium: '中等', hard: '困难' }
//搜索/筛选
function handleSearch() {
  questionStore.fetchlist({
      category:category.value,
      difficulty:difficulty.value,
      keyword:keyword.value

  })
      
     
}

</script>








<style scoped>
.question-bank-container {
  padding: 24px;
}
.question-bank-header h1 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}
.question-bank-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.filter-area {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.question-card {
  display: block;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  text-decoration: none;
  color: #333;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}
.question-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
}
.question-id {
  margin: 0;
  font-size: 13px;
  color: #999;
}
.question-title {
  margin: 8px 0;
  font-size: 15px;
  line-height: 1.6;
}
.question-card p {
  margin: 4px 0;
  font-size: 13px;
  color: #666;
}
</style>
