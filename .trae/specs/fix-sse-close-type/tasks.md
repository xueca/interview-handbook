# Tasks

- [x] Task 1: 修复 `api/sse.js` — `createSSE` 返回 close 函数而非对象
  - [x] 将 `return { close: () => controller.abort() }` 改为 `return () => controller.abort()`
- [x] Task 2: 修复 `composables/useAiChat.js` — `abortCurrent` 防御性检查
  - [x] 将 `if (sseState.close)` 改为 `if (typeof sseState.close === 'function')`
- [x] Task 3: 补充非流式降级逻辑（按 SSE 契约手册）
  - [x] 在 `useAiChat.js` 的 `handleError` 中，重试1次失败后调用非流式接口 `generate()` / `chat()`
  - [x] 非流式结果包装为 message 并显示
- [x] Task 4: 验证修复
  - [x] 未登录状态点击"快捷出题"不报 TypeError
  - [x] 正常登录状态流式出题正常
  - [x] 流式失败后自动降级到非流式

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1, 2, 3
