import { ref, computed, onUnmounted } from 'vue'

export default function useTimer(initialSeconds = 180) {
  const timerId = ref(null)
  const isRunning = ref(false)
  const remainingSeconds = ref(initialSeconds)

  const isTimeout = computed(() => remainingSeconds.value <= 0)
  const minutes = computed(() => Math.floor(remainingSeconds.value / 60))
  const seconds = computed(() => remainingSeconds.value % 60)
  const formattedTime = computed(() =>
    `${minutes.value}:${seconds.value.toString().padStart(2, '0')}`
  )

  function start() {
    if (isRunning.value) return
    isRunning.value = true
    timerId.value = setInterval(() => {
      if (remainingSeconds.value <= 0) {
        clearInterval(timerId.value)
        isRunning.value = false
        return
      }
      remainingSeconds.value--
    }, 1000)
  }

  function stop() {
    isRunning.value = false
    clearInterval(timerId.value)
    timerId.value = null
  }

  function reset(newSeconds) {
    stop()
    remainingSeconds.value = newSeconds ?? initialSeconds
  }

  onUnmounted(stop)

  return {
    isRunning,
    remainingSeconds,
    isTimeout,
    formattedTime,
    start,
    stop,
    reset
  }
}
