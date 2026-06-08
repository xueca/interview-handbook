// 布局组件: 侧边栏+主内容区 → useDarkMode切换暗黑 | 移动端: 汉堡菜单+遮罩层
<script setup>
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { useUserStore } from './stores/user'
import { useDarkMode } from './composables/useDarkMode'
import {
  HomeFilled,
  Tickets,
  Timer,
  DocumentDelete,
  ChatDotRound,
  Sunny,
  Moon,
  Close,
  Expand,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { isDark, toggleDark } = useDarkMode()
const sidebarOpen = ref(false)

const isLoginPage = computed(() => route.meta.noLayout)

// 移动端菜单选择后自动关闭侧边栏
function handleSelect(index) {
  router.push(index)
  sidebarOpen.value = false
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <template v-if="isLoginPage">
    <router-view />
  </template>
  <template v-else>
    <div class="layout">
      <!-- 移动端遮罩层 -->
      <div class="sidebar-overlay" :class="{ active: sidebarOpen }" @click="closeSidebar"></div>
      <el-menu
        :default-active="route.path"
        :router="false"
        @select="handleSelect"
        class="sidebar"
        :class="{ open: sidebarOpen }"
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
        <el-menu-item index="/wrong-book">
          <el-icon><DocumentDelete /></el-icon>
          <span>错题本</span>
        </el-menu-item>
        <el-menu-item index="/ai-chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>AI助手</span>
        </el-menu-item>
        <div class="sidebar-footer">
          <span class="user-name">{{ userStore.userInfo?.username }}</span>
          <div class="footer-actions">
            <el-button
              :icon="isDark ? Sunny : Moon"
              circle
              size="small"
              @click="toggleDark"
              :title="isDark ? '切换亮色模式' : '切换暗黑模式'"
            />
            <el-button type="danger" size="small" plain @click="handleLogout">退出</el-button>
          </div>
        </div>
      </el-menu>
      <div class="main-content">
        <!-- 移动端顶部栏 -->
        <div class="mobile-header">
          <el-button class="hamburger-btn" :icon="sidebarOpen ? Close : Expand" @click="toggleSidebar" />
          <span style="font-size: 16px; font-weight: 600; color: #409eff;">面试宝典</span>
        </div>
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
  flex-direction: column;
  gap: 10px;
}
.footer-actions {
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
