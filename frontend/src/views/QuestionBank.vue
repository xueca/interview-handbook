<script setup>
import { onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import useQuestionBank from '../composables/useQuestionBank'

const {
  store, categories, difficulties,
  filter, currentPage, pageSize,
  difficultyMap, difficultyColor,
  loadData, handleFilter, handlePageChange,
  goToQuiz, startQuiz, displayList,
} = useQuestionBank()

onMounted(() => { loadData() })
</script>

<template>
  <div class="question-bank">
    <!-- 筛选区 -->
    <el-card class="filter-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-select
            v-model="filter.category"
            placeholder="选择分类"
            clearable
            @change="handleFilter"
            style="width: 100%"
          >
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filter.difficulty"
            placeholder="选择难度"
            clearable
            @change="handleFilter"
            style="width: 100%"
          >
            <el-option
              v-for="d in difficulties"
              :key="d.value"
              :label="d.label"
              :value="d.value"
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="filter.keyword"
            placeholder="搜索题目关键词"
            clearable
            :prefix-icon="Search"
            @keyup.enter="handleFilter"
            @clear="handleFilter"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleFilter">搜索</el-button>
        </el-col>
      </el-row>
      <el-row :gutter="16" style="margin-top: 12px">
        <el-col :span="24">
          <el-button
            type="success"
            :disabled="store.list.length === 0"
            @click="startQuiz"
          >
            开始答题（共 {{ store.list.length }} 题）
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 题目卡片列表 -->
    <div v-loading="store.loading" class="question-list">
      <el-card
        v-for="q in displayList"
        :key="q.id"
        class="question-card"
        shadow="hover"
      >
        <div class="card-header">
          <span class="question-id">#{{ q.id }}</span>
          <el-tag size="small">{{ q.category }}</el-tag>
          <el-tag
            size="small"
            :type="difficultyColor[q.difficulty]"
          >
            {{ difficultyMap[q.difficulty] }}
          </el-tag>
        </div>
        <p class="question-title">{{ q.title }}</p>
        <div class="card-actions">
          <el-button type="primary" size="small" @click.stop="goToQuiz(q)">查看详情</el-button>
        </div>
      </el-card>

      <el-empty v-if="!store.loading && store.list.length === 0" description="暂无题目" />
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="store.list.length > 0">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="store.list.length"
        layout="prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>
  </div