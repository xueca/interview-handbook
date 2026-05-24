<template>
  <!-- 如果是登录页，全屏显示，不包侧边栏 -->
   <template v-if="isFullPage()">
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
         <el-menu-item index="/questions">
           <el-icon><Document /></el-icon>
           <span> 题库 </span>
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

// 导入 Element Plus 图标
import { HomeFilled, Document } from '@element-plus/icons-vue'
// 获取当前路由信息
const route = useRoute()
// 判断当前页面是否不需要侧边栏
const isFullPage = () => route.path === '/login'

</script>



<style scoped>
.app-container{
  height: 100vh;
}
.app-side{
  background-color: #304156;
  color: #fff;
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
  background-color: #f0f2f5;
}
</style>
