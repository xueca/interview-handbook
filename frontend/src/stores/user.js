import  {defineStore} from 'pinia'
import { ref } from 'vue'
import  {login as loginApi, register as registerApi, getMe as getMeApi} from '../api/auth'


export const useUserstore =defineStore('user',()=>
{
    // state：存 token 和 userInfo
    const token = ref(localStorage.getItem('token')||'')
    const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

    // 登录
    async function login(username,password){
        const res = await loginApi(username,password)
        if (res.code === 0) {
           // 保存token
           token.value = res.data.token
           localStorage.setItem('token',res.data.token)
           // 保存用户信息
           userInfo.value =res.data.user
           localStorage.setItem('userInfo',JSON.stringify(res.data.user))
        }
        return res
    }
    
    //退出登录
    function logout(){
        token.value = ''
        userInfo.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
    }

    // 获取当前用户信息（刷新页面时用来验证 token 是否有效）
    async function getUserInfo() {
        if (!token.value) return
        const res = await getMeApi()
        if(res.code === 0) {
            userInfo.value = res.data
        }else {
            // token 无效，退出登录
            logout()
        }
    }

    return { token, userInfo, login, logout, getUserInfo }
}

)