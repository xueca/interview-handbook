<template>
  <div>
    <h1>欢迎,{{ userStore.userInfo?.nickname || '用户' }}</h1>
  </div>
</template>

<script setup>
//导入用户状态
import { useUserstore } from '../stores/user';
//获取store
const userStore = useUserstore()
</script>

<style scoped>
</style>
