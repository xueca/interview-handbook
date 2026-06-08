// user store: token/userInfo/login()/register()/logout()
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { login as loginApi, register as registerApi } from '../api/auth'

// 登录
async function loginUser(saveUser, username, password) {
  const res = await loginApi(username, password)
  saveUser(res.token, res.user)
  ElMessage.success('登录成功')
  return res
}

// 注册
async function registerUser(saveUser, username, password) {
  const res = await registerApi(username, password)
  saveUser(res.token, res.user)
  ElMessage.success('注册成功')
  return res
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  function saveUser(newToken, user) {
    token.value = newToken
    userInfo.value = user
    localStorage.setItem('token', newToken)
    localStorage.setItem('userInfo', JSON.stringify(user))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    token, userInfo,
    saveUser,
    login: (u, p) => loginUser(saveUser, u, p).catch(e => { ElMessage.error(e.response?.data?.error || '登录失败'); throw e }),
    register: (u, p) => registerUser(saveUser, u, p).catch(e => { ElMessage.error(e.response?.data?.error || '注册失败'); throw e }),
    logout
  }
})
