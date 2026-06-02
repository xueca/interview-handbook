import {useUserstore} from '../stores/user'

export function createSSEConnection(params,{onMessage,onError,onDone}){
    // 从 localStorage 取 token
    const token = localStorage.getItem('token')
    if(!token){
        onError?.(new Error('未登录'))
        return () => {}
    }
    // 拼接 URL：基础路径 + 业务参数 + token
    const query = new URLSearchParams({
        ...params,
        token,
    })
    const url = `/api/ai/generate/stream?${query.toString()}`
   // 创建 EventSource 连接
   const source = new EventSource(url)
   let retryCount = 0
   const MAX_RETRY = 3 // 最大重试次数
   source.onmessage = (event) => {
    if (event.data === '[DONE]') {
        source.close()
        onDone?.()
        return
    }
    try {
        const data = JSON.parse(event.data)
        if (data.error) {
            onError?.(new Error(data.error))
        }else {
            onMessage?.(data)
        }
    } catch(e){
       // 跳过解析失败的数据 
    }
}
source.onerror = (err) => {
    retryCount++
    if(retryCount >= MAX_RETRY){
    source.close()
    onError?.(err)
    }
   
  }
 // 返回关闭函数，供组件卸载时调用
  return () => source.close()
}