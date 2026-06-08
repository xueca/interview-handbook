import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import QuestionBank from '../views/QuestionBank.vue'
import Quiz from '../views/Quiz.vue'
import WrongBook from '../views/WrongBook.vue'
import AiChat from '../views/AiChat.vue'
import NotFound from '../views/NotFound.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { noLayout: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
  },
  {
    path: '/question-bank',
    name: 'QuestionBank',
    component: QuestionBank,
  },
  {
    path: '/quiz',
    name: 'Quiz',
    component: Quiz,
  },
  {
    path: '/wrong-book',
    name: 'WrongBook',
    component: WrongBook,
  },
  {
    path: '/ai-chat',
    name: 'AiChat',
    component: AiChat,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { noLayout: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫：未登录跳登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.name !== 'Login' && !token) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
