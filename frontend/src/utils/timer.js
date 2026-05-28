import { ref } from 'vue'
import { computed } from 'vue'

 function useTimer(initialSeconds = 180){
    const timerId = ref(null)
    const isRunning = ref(false)
    const remainingSeconds = ref(initialSeconds)
    const minutes = computed(() => Math.floor(remainingSeconds.value / 60))
    const seconds = computed(() => remainingSeconds.value % 60)
    const isTimeout = computed(() => remainingSeconds.value <= 0)
    const formattedTime = computed(() => `${minutes.value}:${seconds.value.toString().padStart(2, '0')}`)

function startTimer(){
    isRunning.value = true
    timerId.value = setInterval(() => {
        if (remainingSeconds.value <= 0) {
            // 归零后停止计时器，防止变负数
            clearInterval(timerId.value)
            isRunning.value = false
            return
        }
        remainingSeconds.value--  
    }, 1000)
    }

function stop(){
    isRunning.value = false
    clearInterval(timerId.value)
    timerId.value = null
}  
function reset(newSeconds = initialSeconds){
    stop()
    remainingSeconds.value = newSeconds
}
function cleanup(){
     stop()
}
return {
    isRunning,
    remainingSeconds,
    minutes,
    seconds,
    isTimeout,
    formattedTime,
    startTimer,
    stop,
    reset,
    cleanup

}

}
export default useTimer

