// 文件功能: 个人中心业务逻辑（资料获取 + 改用户名 + 改密码） | 数据流: Profile.vue → useProfile → api/auth → 后端
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { getMe, changePassword as changePasswordApi, updateUsername as updateUsernameApi } from '../api/auth'
import { validateUsername as checkUsername, validatePassword as checkPassword } from '../utils/validator'

export function useProfile() {
  const router = useRouter()
  const userStore = useUserStore()

  const profile = ref({ id: '', username: '', createdAt: '' })
  const loading = ref(false)
  const savingName = ref(false)
  const submitting = ref(false)
  const usernameForm = reactive({ username: '' })
  const passwordForm = reactive({ newPassword: '', confirmPassword: '' })

  // 头像取用户名首字符并大写，空名时兜底为 U，避免渲染空圆圈
  const avatarText = computed(() => (profile.value.username || 'U').charAt(0).toUpperCase())

  // 注册时间格式化为 YYYY-MM-DD HH:mm；无值时显示占位符
  const formattedDate = computed(() => {
    if (!profile.value.createdAt) return '—'
    const d = new Date(profile.value.createdAt)
    const p = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  })

  // 拉取个人资料：getMe 返回含 createdAt，并用当前用户名预填改名输入框
  async function fetchProfile() {
    loading.value = true
    try {
      const res = await getMe()
      profile.value = res.user
      usernameForm.username = res.user.username
    } catch {
      ElMessage.error('个人信息加载失败')
    } finally {
      loading.value = false
    }
  }

  // 修改用户名：成功后用新 token 刷新登录态，使侧边栏显示同步更新
  async function handleUpdateUsername() {
    const name = usernameForm.username.trim()
    const nameErr = checkUsername(name)
    if (nameErr) { ElMessage.warning(nameErr); return }
    if (name === profile.value.username) { ElMessage.info('用户名未改变'); return }
    savingName.value = true
    try {
      const res = await updateUsernameApi(name)
      userStore.saveUser(res.token, res.user)
      profile.value.username = res.user.username
      ElMessage.success('用户名修改成功')
    } catch (e) {
      ElMessage.error(e.response?.data?.error || '用户名修改失败')
    } finally {
      savingName.value = false
    }
  }

  // 校验：密码强度（复用全局规则）+ 两次一致
  function validatePassword() {
    const pwdErr = checkPassword(passwordForm.newPassword)
    if (pwdErr) { ElMessage.warning(pwdErr); return false }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { ElMessage.warning('两次新密码不一致'); return false }
    return true
  }

  // 修改密码：成功后清空登录态并跳登录页，引导用新密码重新登录
  async function handleChangePassword() {
    if (!validatePassword()) return
    submitting.value = true
    try {
      await changePasswordApi(passwordForm.newPassword)
      ElMessage.success('密码修改成功，请重新登录')
      userStore.logout()
      router.push('/login')
    } catch (e) {
      ElMessage.error(e.response?.data?.error || '密码修改失败')
    } finally {
      submitting.value = false
    }
  }

  return {
    profile, loading, savingName, submitting, usernameForm, passwordForm,
    avatarText, formattedDate, fetchProfile, handleUpdateUsername, handleChangePassword,
  }
}
