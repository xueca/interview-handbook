import axios from 'axios'
import router from '@/router'

//创建axions实例
const service = axios.create({
    baseURL:'/api', //代理自动转发到http://localhost:5000
    timeout:7000
})

//请求拦截器
request.interceptors.request.use(
    (config)=>{
     // 从 localStorage 取 token，加到请求头
     const token = localStorage.getItem('token')
     if(token){
        config.headers.Authorization = `Bearer ${token}`
     }
     return config
    },
    (error)=>{
        return Promise.reject(error)
    }
)
//响应拦截器
request.interceptors.response.use(
    (response)=>{
        //200状态码，直接返回data
        return response.data
    },
    (error)=>{
      // 如果是 401（未登录/token过期），跳转到登录页
      if(error.response && error.response.status === 401){
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
      }
      return Promise.reject(error)
    }
)

export default service