// 暗黑模式业务: 状态=isDark 方法=toggle | 数据流: localStorage → html.dark class → CSS变量
import { ref, watch } from 'vue'

const STORAGE_KEY = 'dark_mode'

const isDark = ref(localStorage.getItem(STORAGE_KEY) === 'true')

// 同步 html.dark class
function syncClass(val) {
  document.documentElement.classList.toggle('dark', val)
}

// 初始化时同步一次
syncClass(isDark.value)

watch(isDark, (val) => {
  syncClass(val)
  localStorage.setItem(STORAGE_KEY, String(val))
})

function toggleDark() {
  isDark.value = !isDark.value
}

export function useDarkMode() {
  return { isDark, toggleDark }
}
