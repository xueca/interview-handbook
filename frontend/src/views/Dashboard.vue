<template>
  <div>
    <h1 class="dashboard-title">欢迎,{{ userStore.userInfo?.nickname || '用户' }}</h1>
  </div>
</template>

<script setup>
//导入用户状态
import { useUserstore } from '../stores/user';
//获取store
const userStore = useUserstore()  
</script>

<style scoped>
div{
 width: 100%;            /* 继承父容器宽度（不是 100vw） */
  height: 100vh;          /* 占满视口高度 */
  margin: 0;              /* 去掉外边距 */
  padding: 0;             /* 去掉内边距 */
  background-color: #fff;
  display: flex;          /* 使用 flexbox */
  justify-content: center; /* 水平居中 */
  top: 50%;
  overflow: hidden;       /* 隐藏溢出，防止滚动条 */
}
.dashboard-title{
 font-size: 48px;
  font-weight: bold;
  color: #333;
  margin: 0;              /* 去掉标题默认外边距 */
  text-align: center;     /* 文字居中对齐 */
}
</style>
