<script setup>
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useUserStore } from './stores/user'
import {
  HomeFilled,
  Tickets,
  Timer,
  Histogram,
  DocumentDelete,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isLoginPage = computed(() => route.meta.noLayout)

function handleSelect(index) {
  router.push(index)
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <template v-if="isLoginPage">
    <router-view />
  </template>
  <template v-else>
    <div class="layout">
      <el-menu
        :default-active="route.path"
        :router="false"
        @select="handleSelect"
        class="sidebar"
      >
        <div class="sidebar-title">面试宝典</div>
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/question-bank">
          <el-icon><Tickets /></el-icon>
          <span>题库</span>
        </el-menu-item>
        <el-menu-item index="/quiz">
          <el-icon><Timer /></el-icon>
          <span>答题</span>
        </el-menu-item>
        <el-menu-item index="/stats">
          <el-icon><Histogram /></el-icon>
          <span>统计</span>
        </el-menu-item>
        <el-menu-item index="/wrong-book">
          <el-icon><DocumentDelete /></el-icon>
          <span>错题本</span>
        </el-menu-item>
        <div class="sidebar-footer">
          <span class="user-name">{{ userStore.userInfo?.username }}</span>
          <el-button type="danger" size="small" plain @click="handleLogout">退出</el-button>
        </div>
      </el-menu>
      <div class="main-content">
        <router-view />
      </div>
    </div>
  </template>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 220px;
  height: 100vh;
  overflow-y: auto;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
}
.sidebar-title {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
  border-bottom: 1px solid #e6e6e6;
}
.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.user-name {
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 110px;
}
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f5f7fa;
}
</style>
