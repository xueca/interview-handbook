# SSE 流式数据丢失

> 来源: `specs/fix-ai-generate-sse-data-loss`
> 标签: #SSE #流式传输 #Buffer #数据完整性
> 日期: 2026-06

---

## 问题根因

AI 出题 SSE 流式传输中，有时解析完字符串后未生成格式化题目卡片，而是显示原始 JSON 文本，同时出现 `net::ERR_ABORTED` 报错。

**直接原因**：后端 `handleStreamResponse` 的 buffer 管理存在数据丢失缺陷。DeepSeek API 返回的 SSE 事件可能被 TCP 拆分到多个 `data` 事件，原代码的 `parseStreamChunk` 按 `\n` 逐行处理，没有考虑事件被截断的情况——当一行 JSON 数据被拆分到两个 chunk 时，前半部分被当作完整事件解析，导致 JSON 解析失败，数据丢失。

**深层原因**：SSE 协议的标准事件分隔符是 `\n\n`（双换行），而非 `\n`（单换行）。原代码没有遵循 SSE 标准的事件边界解析策略。

---

## 解决方案

### 后端：按 SSE 标准解析事件

提取 `parseEvents` 辅助函数，按 `\n\n` 分隔符分割 buffer：

```
buffer → parseEvents(buffer)
  ├── 完整事件（以 \n\n 结尾） → 解析并转发
  └── 不完整尾部 → 保留在 buffer，等待下一个 chunk
```

关键逻辑：
- 按 `\n\n` split → 最后一段是未完成事件，保留
- 前 N-1 段是完整事件，逐一解析并转发

### 前端：区分主动中断和网络错误

`api/sse.js` 的 `fetch().catch()` 中过滤 `AbortError`：
- `AbortError`（用户主动停止）→ 静默处理，不触发 `onError`
- 其他错误（超时、DNS 失败、连接断开）→ 正常触发 `onError`

### 文件行数约束

所有函数保持 ≤ 30 行：`handleStreamResponse` 28 行、`parseEvents` ≤ 15 行、`parseStreamChunk` 21 行。

---

## 如何避免再次发生

1. **SSE 解析必须遵循协议标准**：事件分隔符是 `\n\n`，不是 `\n`。任何自行实现的 SSE 解析器都必须按此规则处理 buffer。
2. **TCP 分片是常态，不是特例**：网络传输中 chunk 边界是随机的，不能假设"一个 chunk = 一个完整事件"。buffer 管理必须保留未完成的尾部。
3. **AbortError 必须特殊处理**：`AbortController.abort()` 触发的是主动中断，不是错误。所有 fetch 的 catch 中都要判断 `error.name === 'AbortError'`。
4. **测试覆盖**：用工具模拟 TCP 分片（如 `tc` 命令限速或 mitmproxy 延迟），确保即使事件被拆分到 2-3 个 chunk 也能正确解析。