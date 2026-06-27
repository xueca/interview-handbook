<!-- 思考过程折叠面板: 答案上方显示「已深度思考」，点击展开/收起模型推理全文 | 数据流: msg.reasoning → props.text -->
<script setup>
import { ref } from 'vue'

defineProps({
  // 模型推理全文（reasoning_content 累积结果）
  text: { type: String, default: '' }
})

// 折叠状态：默认收起，点击头部切换
const open = ref(false)
</script>

<template>
  <div class="reasoning-panel">
    <!-- 头部：点击切换展开/收起 -->
    <div class="reasoning-header" @click="open = !open">
      <span>💡 已深度思考</span>
      <span class="reasoning-arrow">{{ open ? '▴' : '▾' }}</span>
    </div>
    <!-- 推理正文：展开时显示，过长则面板内滚动 -->
    <div v-if="open" class="reasoning-body">{{ text }}</div>
  </div>
</template>

<style scoped>
/* 复用 ai-chat.css 的思考态文字色变量，暗黑模式自动适配 */
.reasoning-panel { margin-bottom: 8px; border: 1px solid var(--chat-code-border, #e4e7ed); border-radius: 6px; overflow: hidden; }
.reasoning-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; font-size: 13px; color: var(--chat-thinking-text, #909399); background: var(--chat-code-bg, #f5f7fa); cursor: pointer; user-select: none; }
.reasoning-arrow { font-size: 12px; }
.reasoning-body { padding: 8px 10px; font-size: 13px; line-height: 1.6; color: var(--chat-thinking-text, #909399); white-space: pre-wrap; max-height: 200px; overflow-y: auto; border-top: 1px solid var(--chat-code-border, #e4e7ed); }
</style>
