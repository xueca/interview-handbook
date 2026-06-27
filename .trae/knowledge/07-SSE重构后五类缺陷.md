# SSE 重构后五类缺陷

> 来源: code-review / reborn 分支 Week4 Day26
> 标签: #SSE #错误处理 #流式传输 #内存安全 #token裁剪
> 日期: 2026-06

---

## 缺陷 #1 — SSE 错误事件缺少 `type` 字段，前端永远无法捕获

### 问题排版

- **现象**：DeepSeek API Key 未配置、网络断开、上游超时时，前端不显示任何错误提示，流静默结束。
- **影响范围**：`deepseekService.relaySSE`、`aiController.generateStream`、`chatController.chatStream` 三处错误路径。

### 问题根因

旧代码发送错误事件格式为 `{ type: 'error', error: msg }`。SSE 重构后三处 catch 统一改写时遗漏了 `type` 字段，实际发送 `{ error: msg }`。前端 `buildOnMessage` 的判断条件是 `data.type === 'error'`，两者不匹配，错误被完全忽略。之后 `[DONE]` 到达触发 `finalizeStream`，generate 场景还会额外发起一次无效的 `fallbackToNonStream` API 调用。

### 解决方案

统一三处错误事件格式，补回 `type` 字段：

```js
// deepseekService.js / aiController.js / chatController.js
res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
```

### 如何避免再次发生

1. SSE 协议层的事件字段是**自定义契约**，修改任意一端必须同步另一端。重构时在前后端契约处加注释：`// SSE事件类型：status/content/reasoning/error，与前端 buildOnMessage 对应`。
2. 每次改动 SSE 事件格式后，用 `grep -rn "data.type === 'error'"` 在前端全局确认匹配点没有遗漏。

---

## 缺陷 #2 — `[DONE]` 与 stream EOF 双重触发 `finalizeStream`

### 问题排版

- **现象**：generate 场景 JSON 解析失败时，`fallbackToNonStream` 并发执行两次，向 DeepSeek 发起重复请求；chat 场景 `finish` 被调用两次，LocalStorage 多写一次。
- **影响范围**：`frontend/src/api/sse.js`、`frontend/src/composables/useAiChat.js`。

### 问题根因

`processBuffer` 在解析到 `data: [DONE]` 时立即调用 `onMessage({ type: 'status', status: 'done' })`（第一次）。几毫秒后，底层 fetch 的 `ReadableStream` 真正关闭，`streamRead` 的 `done === true` 分支再次调用同一回调（第二次）。这是 SSE 协议层（`[DONE]` 标记）与 HTTP 传输层（stream EOF）的语义重叠，后端永远同时发两个信号。

```
processBuffer  → [DONE] → onMessage(done)   ← 第一次
streamRead EOF → done:true → onMessage(done) ← 第二次（约10ms后）
```

### 解决方案

在 `buildOnMessage` 闭包内加 `finalized` 标志，第一次 done 后将其置 true，后续 done 事件不再进入 `finalizeStream`：

```js
function buildOnMessage(state, type, input, onComplete) {
  let finalized = false
  return (data) => {
    ...
    } else if (data.type === 'status' && data.status === 'done' && !finalized) {
      finalized = true
      finalizeStream(type, input, state, onComplete)
    }
  }
}
```

`finalized` 是每次 `callSSE` 调用时新建的闭包变量，多轮对话不会互相干扰。

### 如何避免再次发生

1. 任何流式协议都存在"结束标记"与"连接关闭"的双重信号。凡是"收到 done 执行某副作用"的逻辑，都要加幂等保护。
2. `sse.js` 不修改 `processBuffer` 的双重触发行为（语义正确，代价低），由消费方做幂等。这是职责边界：**传输层如实传递，业务层保证幂等**。

---

## 缺陷 #3 — `generateStream` 在 `callDeepSeek` 抛错时响应头不含 `text/event-stream`

### 问题排版

- **现象**：API Key 缺失等原因导致 `callDeepSeek` 在建立流之前就抛异常，catch 块写出错误 SSE 事件，但 HTTP 响应头被 Node.js 自动提交为默认的 `text/html`，不是 `text/event-stream`。
- **影响范围**：`backend/controllers/aiController.js generateStream`。

### 问题根因

`generateStream` 调用顺序是：`callDeepSeek` → 成功后 `initSSE` → `relaySSE`。若 `callDeepSeek` 失败，`initSSE` 从未执行，响应头未设置。catch 块的第一个 `res.write()` 触发 Node.js 隐式 `writeHead(200)`，使用默认 Content-Type。而同文件的 `chatStream` 先调 `initSSE` 再调 `callDeepSeek`，两者实现不对称。

### 解决方案

将 `initSSE(res)` 提到 `callDeepSeek` 之前，与 `chatStream` 保持一致：

```js
exports.generateStream = async (req, res) => {
  try {
    const { category = 'vue', difficulty = 'medium', count = 1 } = req.body
    initSSE(res)  // 先建立 SSE 通道，失败时 catch 里的错误事件才带正确头
    const response = await callDeepSeek({ ... })
    relaySSE(response, res)
  } catch (error) { ... }
}
```

### 如何避免再次发生

1. 同一模块内所有同类函数（`generateStream` / `chatStream`）应共用相同的操作顺序。在 `deepseekService` 层封装一个 `handleStreamRequest(res, getMessages)` 统一处理 `initSSE → callDeepSeek → relaySSE → catch`，就从根本上消除不对称。
2. Code review 时用 `diff` 对比同类函数结构，若顺序不同立即追问原因。

---

## 缺陷 #4 — 重构删除了 `MAX_OUTPUT_CHARS` 上限保护

### 问题排版

- **现象**：DeepSeek 异常（模型配置错误、API 侧 Bug）时可能返回超长流，Node.js 内存无限积压，SSE 连接永久挂起，服务端无法自愈。
- **影响范围**：`backend/services/deepseekService.js relaySSE`。

### 问题根因

旧 `handleStreamResponse` 有明确的 `MAX_OUTPUT_CHARS = 16000`：累计输出超限后主动 `apiRes.destroy()` 断开上游并收尾。将 SSE 逻辑提取到 `deepseekService.relaySSE` 时，这个防护被遗漏了。`max_tokens: 2048` 是 DeepSeek 侧的软限制，无法替代客户端的强制截断。

### 解决方案

在 `relaySSE` 内跟踪累计字符数，超限即主动断开：

```js
function relaySSE(upstream, res) {
  let ended = false, accumulated = 0
  const endStream = () => { ... }

  upstream.data.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      ...
      if (delta.reasoning_content) { accumulated += delta.reasoning_content.length; ... }
      if (delta.content)           { accumulated += delta.content.length; ... }
      // 防暴走：超限断开上游，已生成内容交前端 finalize 解析
      if (accumulated > MAX_OUTPUT_CHARS) { upstream.data.destroy(); endStream(); return }
    }
  })
}
```

### 如何避免再次发生

1. 提取 `deepseekService` 时做 diff checklist：旧实现的每个防御性判断（截断/超时/错误）都要在新实现中对应找到，找不到则明确记录"已知删除，理由是……"。
2. 防暴走上限是**服务端安全策略**，不能依赖上游的 `max_tokens`——上游配置可能出错，客户端保护必须独立存在。

---

## 缺陷 #5 — `trimMessages` 仅按条数裁剪，少量超长消息静默突破 token 预算

### 问题排版

- **现象**：7 条消息但每条都很长（如粘贴代码），token 估算超 4000，不会裁剪也不显示 `tokenWarning`，对话上下文静默过长。
- **影响范围**：`frontend/src/composables/useAiChat.js trimMessages`。

### 问题根因

旧逻辑：先判断 token > 4000，若满足再判断 `messages.length > 10`，只有两个条件同时成立才裁剪。若 token 超限但条数 ≤ 10（典型：5 条超长消息），第二个条件不成立，函数直接返回，既不裁剪也不设 `tokenWarning`。两个条件本应是 OR 关系，写成了 AND。

### 解决方案

改为从最新消息向前累加 token，一旦预算耗尽即记录截断点：

```js
function trimMessages(state) {
  const msgs = state.messages.value
  let tokens = 0, cut = 0
  for (let i = msgs.length - 1; i >= 0; i--) {
    tokens += Math.ceil((msgs[i].content || '').length * 0.5)
    // 超预算且至少保留最新 2 条（当前一问一答）才截断
    if (tokens > MAX_TOKENS && i <= msgs.length - 3) { cut = i + 1; break }
  }
  if (!cut) return
  state.messages.value = msgs.slice(cut)
  state.tokenWarning.value = `对话过长，已裁剪最早${cut}条消息`
  setTimeout(() => { state.tokenWarning.value = null }, 3000)
}
```

### 如何避免再次发生

1. "超过预算就裁剪"是单一职责——不要用第二个条件（条数）作为裁剪的额外门槛，两者语义不同。
2. 写裁剪逻辑时加注释说明**至少保留几条**及原因，防止后续改动误删这个保护条件（当前设为 2，确保不清空当前对话）。
3. 单元测试用例：5 条消息各 2000 字符 → `trimMessages` 后应 ≤ 2 条 + `tokenWarning` 已设置。
