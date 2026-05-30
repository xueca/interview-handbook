<template>
  <!-- 如果是登录页，全屏显示，不包侧边栏 -->
   <template v-if="isFullPage">
     <router-view />
   </template >
  <!-- 其他页面：正常显示侧边栏 + 内容区 -->
   <template v-else>
  <!-- 整体容器：侧边栏 + 主内容区 -->
  <el-container class="app-container">
   <!-- 左侧菜单 -->
    <el-aside width="220px" class="app-side">
     <!-- 标题区 -->
      <div class="app-title">
        面试宝典
      </div>
      <!-- 导航菜单 -->
       <el-menu :router="true">
         <el-menu-item index="/">
           <el-icon><HomeFilled /></el-icon>
           <span> 首页 </span>
         </el-menu-item>
         <!-- 答题页面隐藏题库入口 -->
         <el-menu-item v-if="!route.path.startsWith('/quiz')" index="/questions">
           <el-icon><Document /></el-icon>
           <span> 题库 </span>
         </el-menu-item>
         <el-menu-item v-if="route.path !== '/quiz'" index="/wrongbook">
          <el-icon><CircleCloseFilled /></el-icon>
          <span> 错题本 </span>
         </el-menu-item>
       </el-menu>
    </el-aside>
    <el-main class="app-main">
       <router-view />
    </el-main>
  </el-container>
  </template>
</template>

<script setup>
//导入 Vue Router
import { useRoute } from 'vue-router';
import { computed, onMounted } from 'vue'
import { useUserstore } from './stores/user'
// 导入 Element Plus 图标
import { HomeFilled, Document, CircleCloseFilled } from '@element-plus/icons-vue'
// 获取当前路由信息
const route = useRoute()
// 判断当前页面是否不需要侧边栏（仅登录页全屏显示）
// 用 computed 包裹，确保路由变化时能响应式更新
const isFullPage = computed(() => {
  const path = route.path
  return path === '/login'
})

const userStore = useUserstore()
onMounted(() => {
  // 刷新页面时，如果 token 存在，验证它是否有效
  if (userStore.token) {
    userStore.getUserInfo()
  }
})



</script>



<style scoped>
.app-container{
  height: 100vh;
}
.app-side{
  background-color: #304156;
  color: #fff;
  position: fixed;
  height: 100%;
  width: 220px;
  left: 0;
  top: 0;
}
.app-title {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.app-main {
  margin-left: 220px;  /* 给侧边栏留出位置 */
  height: 100vh;       /* 占满整个视口高度 */
  width: calc(100% - 220px);  /* 减去侧边栏宽度 */
  padding: 0;          /* 去掉默认内边距 */
  overflow: auto;      /* 改为 auto，内容超出时可滚动 */
}
</style>
