import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy:{
      '/api':{
        target:'http://localhost:5000',
        changeOrigin:true,
        rewrite:(path)=>path.replace(/^\/api/,''),
        // SSE 等长连接场景：关闭 proxy 超时，避免被 Vite 中断
        timeout: 0,
        proxyTimeout: 0,
        selfHandleResponse: false
      }
    }
  }
})
