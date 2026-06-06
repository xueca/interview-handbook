<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const isRegister = ref(false)
const form = ref({ username: '', password: '', confirmPassword: '' })
const loading = ref(false)

function toggleMode() {
  isRegister.value = !isRegister.value
  form.value.password = ''
  form.value.confirmPassword = ''
}

async function handleSubmit() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }
  if (isRegister.value && form.value.password !== form.value.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }

  loading.value = true
  try {
    if (isRegister.value) {
      await userStore.register(form.value.username, form.value.password)
    } else {
      await userStore.login(form.value.username, form.value.password)
    }
    router.push('/')
  } catch {
    // 错误已在 request.js 拦截器中处理
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2>{{ isRegister ? '注册' : '登录' }}</h2>
      <el-form :model="form" @keyup.enter="handleSubmit">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item v-if="isRegister">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%"
            @click="handleSubmit"
          >
            {{ isRegister ? '注册' : '登录' }}
          </el-button>
   