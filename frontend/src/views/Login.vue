<script setup>
import { ref } from 'vue'
import {  useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserstore } from '../stores/user'

const userStore = useUserstore()
const router = useRouter()

// 控制当前是登录还是注册模式
const isLogin = ref(true)

//表单数据
const form = ref({
    username: '',
    password: ''
})
// 提交表单
async function handleSubmit() {
    // 1. 简单的参数校验
    if(!form.value.username || !form.value.password){
        ElMessage.warning("请输入用户名和密码")
        return
    }
    // 2. 调用登录或注册
    let res
    if(isLogin.value){
        res = await userStore.login(form.value.username, form.value.password)
    }else{
        res = await userStore.register(form.value.username, form.value.password)
    }
    // 3. 成功则跳转，失败则提示
    if (res.code === 0){
        ElMessage.success(isLogin.value ? '登陆成功' : '注册成功')
        router.push('/')
    }else {
        ElMessage.error(res.message || '注册失败')
    }


}
</script>

<template>
    <div class="login-container">
       <div class="login-card">
          <h2>
            {{ isLogin ? '登录' : '注册' }}
          </h2>
       </div>
    </div>
    <el-form :model="form" label-width="80px">
        <el-form-item label="用户名"> 
          <el-input v-model="form.username" placeholder="请输入用户名"/>
         </el-form-item>
        <el-form-item label="密码"> 
          <el-input v-model="form.password" placeholder="请输入密码"/>
         </el-form-item>
         <el-button type="primary" class="submit-btn" @click="handleSubmit">
               {{ isLogin? '登录' : '注册'}}
         </el-button>
         <p class="toggle-text">
           {{ isLogin? '没有账号？' : '已有账号？' }}
           <span class="toggle-link" @click="isLogin = !isLogin">
                 {{ isLogin ? '去注册' : '去登录' }}
           </span>
         </p>
    </el-form>
</template>


<style scoped>

</style>
