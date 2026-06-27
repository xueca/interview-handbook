# AI 出题 SSE 数据丢失修复 Spec

## Why

用户报告两个相关问题：
1. `net::ERR_ABORTED` 报错出现在 `POST /api/ai/generate/stream` 请求中
2. AI 出题有时解析完字符串后未生成格式化题目卡片，而是显示原始 JSON 文本

根因在于 SSE 流式传输过程中，后端 `handleStreamResponse` 的 buffer 管理存在数据丢失缺陷，且前端 `createSSE` 未正确区分主动中断和真实网络错误。

## What Changes

- **前端 `api/sse.js`**：在 `fetch().catch()` 中过滤 `AbortError`，避免主动中断被误报为网络错误
- **后端 `aiController.js`**：
  - 提取 `parseEvents` 辅助函数，按 SSE 标准分隔符 `\n\n` 分隔 buffer 为完整事件和不完整尾部
  - 修改 `handleStreamResponse` 使用 `parseEvents`，保留未解析完整的事件在 buffer 中，防止数据截断丢失
  - 保持 `parseStreamChunk` 函数不变，维持职责单一

## Impact

- Affected specs: Day 16 SSE 流式传输、Day 17 AI 对话、Day 18 错误处理
- Affected code: `frontend/src/api/sse.js`, `backend/controllers/aiController.js`
- No breaking changes: API 返回结构不变（仍为 `{ type: 'content' }` / `{ type: 'status' }`）

## ADDED Requirements

### Requirement: SSE Buffer 完整事件解析

后端 `handleStreamResponse` SHALL 按 SSE 标准 `\n\n` 分隔符将 buffer 分割为完整事件和不完整尾部。

#### Scenario: 事件被拆分到多个 TCP chunk
- **WHEN** DeepSeek API 返回的 SSE 事件被 TCP 拆分到多个 `data` 事件
- **THEN** 只有以 `\n\n` 结尾的完整事件被解析转发，不完整的尾部保留在 buffer 中等待下一个 chunk

#### Scenario: 多个完整事件 + 一个被截断事件
- **WHEN** buffer 中包含 3 个完整事件和 1 个被截断的事件
- **THEN** 3 个完整事件被解析并转发，被截断事件保留在 buffer 中，不丢失

### Requirement: AbortError 静默处理

前端 `createSSE` SHALL 区分主动中断（`AbortError`）和真实网络错误。

#### Scenario: 用户点击停止或发送新消息
- **WHEN** `AbortController.abort()` 被调用导致 fetch 中断
- **THEN** 不触发 `onError` 回调，不显示错误提示，不触发重试逻辑

#### Scenario: 真实网络错误
- **WHEN` 发生超时、DNS 失败、连接断开等非 Abort 错误
- **THEN** 正常触发 `onError` 回调，由 `useAiChat.js` 的错误处理接管

## MODIFIED Requirements

### Requirement: handleStreamResponse 行数合规

修改后的 `handleStreamResponse` 及其提取的辅助函数均 SHALL ≤ 30 行。

- `handleStreamResponse`：当前 28 行，修改后预计 28 行（替换 `parseStreamChunk(buffer)` 为 `parseEvents(buffer)`）
- `parseEvents`：新提取，预计 ≤ 15 行
- `parseStreamChunk`：保持不变，当前 21 行
