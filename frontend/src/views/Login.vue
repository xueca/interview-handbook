<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { validateUsername, validatePassword } from '../utils/validator'

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
  // 仅注册做格式/强度校验，登录放行以兼容旧账号
  if (isRegister.value) {
    const vErr = validateUsername(form.value.username) || validatePassword(form.value.password)
    if (vErr) {
      ElMessage.warning(vErr)
      return
    }
    if (form.value.password !== form.value.confirmPassword) {
      ElMessage.warning('两次密码不一致')
      return
    }
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
      <el-form
        :model="form"
        @keyup.enter="handleSubmit"
      >
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
            :placeholder="isRegister ? '6-32位，需包含字母和数字' : '密码'"
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
        </el-form-item>
      </el-form>
      <p
        class="toggle"
        @click="toggleMode"
      >
        {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
      </p>
    </el-card>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.login-card {
  width: 400px;
}
.login-card h2 {
  text-align: center;
  margin-bottom: 20px;
}
.toggle {
  text-align: center;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
}
.toggle:hover {
  color: #79bbff;
}
</style>
