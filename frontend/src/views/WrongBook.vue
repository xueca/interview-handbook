<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import useWrongBook from '../composables/useWrongBook'
import { ElMessage } from 'element-plus'
import { Star, StarFilled } from '@element-plus/icons-vue'

const router = useRouter()
const {
  loading, expandedId, markedIds, filter, selectedIds, categories, filteredList,
  diffMap, diffColor,
  loadWrong, handleToggleMark, toggleExpand, toggleSelect, selectAll, clearFilter
} = useWrongBook()

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

function retryQuestion(q) {
  router.push({ path: '/quiz', query: { id: q.id } })
}

function batchRetry() {
  const ids = [...selectedIds.value]
  if (ids.length === 0) {
    ElMessage.warning('请先选择要重答的题目')
    return
  }
  router.push({ path: '/quiz', query: { ids: ids.join(',') } })
}

function exportWrong() {
  if (filteredList.value.length === 0) {
    ElMessage.warning('没有错题可导出')
    return
  }
  const lines = filteredList.value.map((q, i) => {
    const opts = q.options.map((o, j) => `  ${LABELS[j]}. ${o}`).join('\n')
    return `${i + 1}. ${q.title}\n${opts}\n  正确答案: ${LABELS[q.answer]}\n  解析: ${q.analysis}`
  })
  const text = `【错题本】共 ${filteredList.value.length} 题\n\n${lines.join('\n\n')}`
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('错题已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

onMounted(() => { loadWrong() })
</script>

<template>
  <div class="wrong-book">
    <div class="page-header">
      <h2>错题本</h2>
      <el-button type="primary" size="small" @click="exportWrong">导出错题</el-button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filter.category" placeholder="分类" clearable size="small" style="width: 120px">
        <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select v-model="filter.difficulty" placeholder="难度" clearable size="small" style="width: 100px">
        <el-option label="简单" value="easy" />
        <el-option label="中等" value="medium" />
        <el-option label="困难" value="hard" />
      </el-select>
      <el-input v-model="filter.keyword" placeholder="关键词搜索" clearable size="small" style="width: 180px" />
      <el-checkbox v-model="filter.onlyMarked" size="small">只看标记</el-checkbox>
      <el-button size="small" @click="clearFilter">重置</el-button>
    </div>

    <!-- 批量操作 -->
    <div class="batch-bar" v-if="filteredList.length > 0">
      <el-checkbox @change="selectAll">全选</el-checkbox>
      <el-button type="primary" size="small" @click="batchRetry" :disabled="selectedIds.size === 0">
        批量重答 ({{ selectedIds.size }})
      </el-button>
    </div>

    <div v-loading="loading">
      <el-card v-for="q in filteredList" :key="q.id" class="wrong-item" shadow="hover">
        <div class="item-header" @click="toggleExpand(q.id)">
          <el-checkbox
            :model-value="selectedIds.has(q.id)"
            @click.stop
            @change="toggleSelect(q.id)"
          />
          <span class="item-title">{{ q.title }}</span>
          <div class="item-tags">
            <el-tag size="small" :type="diffColor[q.difficulty]">{{ diffMap[q.difficulty] }}</el-tag>
            <el-tag size="small">{{ q.category }}</el-tag>
            <el-icon
              :size="18"
              :color="markedIds.has(q.id) ? '#f56c6c' : '#c0c4cc'"
              style="cursor: pointer; margin-left: 4px;"
              @click.stop="handleToggleMark(q.id)"
            >
              <StarFilled v-if="markedIds.has(q.id)" />
              <Star v-else />
            </el-icon>
          </div>
        </div>
        <div v-if="expandedId === q.id" class="item-detail">
          <div v-for="(opt, i) in q.options" :key="i" class="detail-option"
            :class="{ correct: i === q.answer }">
            {{ LABELS[i] }}. {{ opt }}
          </div>
          <p class="detail-analysis"><strong>解析：</strong>{{ q.analysis }}</p>
          <el-button type="primary" size="small" @click="retryQuestion(q)" style="margin-top: 8px">重新作答</el-button>
        </div>
      </el-card>
      <el-empty v-if="!loading && filteredList.length === 0" description="暂无错题，继续保持！" />
    </div>
  </div>
</template>

<style scoped>
.wrong-book { max-width: 960px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 20px; color: #303133; }
.filter-bar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.batch-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; }
.wrong-item { margin-bottom: 12px; cursor: pointer; }
.item-header { display: flex; align-items: center; gap: 8px; }
.item-title { font-size: 15px; color: #303133; flex: 1; }
.item-tags { display: flex; gap: 6px; flex-shrink: 0; }
.item-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid #ebeef5; }
.detail-option { padding: 6px 0; font-size: 14px; color: #606266; }
.detail-option.correct { color: #67c23a; font-weight: 500; }
.detail-analysis { margin-top: 8px; font-size: 14px; color: #303133; line-height: 1.6; }
</style>
