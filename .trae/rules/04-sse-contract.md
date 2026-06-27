---
alwaysApply: false
globs: "frontend/src/views/AiChat.vue,frontend/src/composables/useAiChat.js,frontend/src/api/sse.js,backend/controllers/aiController.js"
---

# SSE架构契约（AiChat相关文件生效）

> 版本: v3.0 | 项目: 面试宝典（Interview Handbook）
> 本规则仅在涉及 AiChat/SSE 的文件时生效。

## 分层职责（严格区分）

```
views/AiChat.vue          → ❌ 不处理SSE，只调用 useAiChat()
composables/useAiChat.js  → ✅ 业务状态管理（messages数组、回调处理）
api/sse.js                → ✅ HTTP连接封装（fetch+ReadableStream）
```

## 三段式数据流

```
content stream → heartbeat → parsed results
```

1. **content**: AI生成的原始文本流
2. **status**: 服务端状态标记（generating/completed/error）
3. **parsed**: 前端解析后的结构化数据

## Token传递

- POST请求：Header 传 token
- GET请求：URL 参数传 token（仅旧接口兼容）

## 错误降级

```
重试1次 → 切非流式 → 提示用户
```

## 裁决规则

当"SSE放视图层更直观"与"分层契约"冲突时，**听分层的**。视图层只负责"显示什么"，不负责"怎么拿到"。
