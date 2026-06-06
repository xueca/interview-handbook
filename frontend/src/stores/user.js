import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { login as loginApi, register as registerApi } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  function saveUser(newToken, user) {
    token.value = newToken
    userInfo.value = user
    localStorage.setItem('token', newToken)
    localStorage.setItem('userInfo', JSON.stringify(user))
  }

  async function login(username, password) {
    const res = await loginApi(username, password)
    saveUser(res.token, res.user)
    ElMessage.success('登录成功')
    return res
  }

  async function register(username, password) {
    const res = await registerApi(username, password)
    saveUser(res.token, res.user)
    ElMessage.success('注册成功')
    return res
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { token, userInfo, login, register, logout }
})
