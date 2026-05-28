import { createRouter, createWebHistory } from 'vue-router'

//定义路由
const routes = [
    {
        path: '/login',
        name: 'login',
        component: () => import('../views/Login.vue')
    },
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
    },
    {
        path:'/questions',
        name:'QuestionBank',
        component:() => import('../views/QuestionBank.vue')
    }, 
    {
        path:'/quiz',
        name:'Quiz',
        component:() => import('../views/Quiz.vue')
    },   
    {
        path:'/quiz/result',
        name:'QuizResult',
        component:() => import('../views/QuizResult.vue')
    },
    {
        path:'/:pathMatch(.*)*',
        name:'NotFound',
        component: () => import('../views/NotFound.vue')
    
    }
]

//创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

//路由守卫
router.beforeEach((to,from) => {
    // 1. 从 localStorage 取 token
    const token = localStorage.getItem('token')

    // 2. 如果去的是登录页，直接放行
    if(to.path === '/login'){
        return true
    }

    // 3. 如果没 token，强制跳登录页
    if(!token){
       return '/login'
    } 
    //4.有token,放行
    return true
})

export default router