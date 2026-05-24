import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import pinia from './stores'
import elementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'

createApp(App).use(pinia).use(elementPlus).use(router).mount('#app')
