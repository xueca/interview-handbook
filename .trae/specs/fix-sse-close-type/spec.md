# 修复 SSE 流式 close 方法丢失 Spec

## Why

点击"快捷出题"时抛出 `TypeError: sseState.close is not a function`，原因是 `createSSE` 在 `fetch` 失败（如 401 未登录）时走 `.catch(onError)`，不会返回 `{ close }` 对象，导致 `sseState.close` 被赋值为 `undefined`，后续 `abortCurrent()` 调用 `sseState.close()` 报错。

## What Changes

- **修复 `api/sse.js`**：`createSSE` 必须始终返回 `{ close }` 对象，无论 fetch 成功或失败。当前代码只在 fetch 成功路径返回，失败路径（catch）不返回。
- **修复 `composables/useAiChat.js`**：`abortCurrent()` 增加防御性检查，确保 `sseState.close` 是函数才调用。
- **补充错误降级**：按 SSE 契约手册 `重试1次 → 切非流式 → 提示用户`，当前缺少"切非流式"降级逻辑。

## Impact

- Affected specs: SSE架构契约（04-sse-contract.md）
- Affected code:
  - `frontend/src/api/sse.js` — createSSE 返回值修复
  - `frontend/src/composables/useAiChat.js` — abortCurrent 防御 + 降级逻辑

## Root Cause Analysis

### 调用链

```
AiChat.vue:32  handleQuickGenerate()
  → useAiChat.js:112  generateQuestions()
    → useAiChat.js:58  callSSE('generate', prompt)
      → useAiChat.js:86  sseState.close = generateStream(input, onMessage, onError)
        → api/ai.js:13  generateStream() → createSSE('/api/ai/generate/stream', ...)
          → api/sse.js:6  createSSE()
```

### 问题1：`createSSE` 失败时不返回 close 对象

```js
// api/sse.js 当前代码
export function createSSE(url, body, onMessage, onError) {
  const controller = new AbortController()
  fetch(url, { ... }).then(...).catch(onError)  // ← catch 走 onError，但函数没有返回值
  return { close: () => controller.abort() }     // ← 这行在 fetch 之外，同步执行，OK
}
```

**等等**，仔细看代码：`return { close: () => controller.abort() }` 在 `fetch` 之外，是同步执行的。所以 `createSSE` 实际上**始终返回** `{ close }` 对象。

**真正的问题**：当 fetch 失败（如 401），`.catch(onError)` 被调用，`onError` 触发 `handleError`，`handleError` 可能触发重试 `callSSE`，在重试时 `abortCurrent()` 被调用，此时 `sseState.close` 是上一次赋的值——是一个**普通对象** `{ close: () => controller.abort() }`，而不是一个函数。

### 问题2：`sseState.close` 被赋值为对象而非函数

```js
// useAiChat.js:86
sseState.close = type === 'chat' ? chatStream(input, onMessage, onError) : generateStream(input, onMessage, onError)
```

`chatStream` / `generateStream` 返回的是 `createSSE` 的返回值，即 `{ close: () => controller.abort() }` —— 一个**对象**，不是函数。

但 `abortCurrent()` 把它当函数调用：

```js
// useAiChat.js:57
function abortCurrent() { if (sseState.close) { sseState.close(); sseState.close = null } }
```

`sseState.close` 是 `{ close: fn }`，不是 `fn`，所以 `sseState.close()` 报错 `TypeError: sseState.close is not a function`。

## ADDED Requirements

### Requirement: SSE close 方法类型一致

`createSSE` 返回的 close 必须是一个**函数**，而非包含 close 属性的对象。`useAiChat.js` 中 `sseState.close` 必须始终是函数类型或 null。

#### Scenario: 正常流式调用
- **WHEN** 用户点击"快捷出题"
- **THEN** `createSSE` 返回的 close 是可调用函数
- **AND** `abortCurrent()` 能正常中断 SSE 连接

#### Scenario: fetch 失败（如 401）
- **WHEN** SSE 连接因认证失败被拒绝
- **THEN** `onError` 被调用，`sseState.close` 仍为可调用函数
- **AND** 不抛出 `TypeError`

### Requirement: SSE 错误降级（按契约手册）

按 04-sse-contract.md 规定的 `重试1次 → 切非流式 → 提示用户` 流程，当前缺少"切非流式"降级。

#### Scenario: 流式失败后降级到非流式
- **WHEN** SSE 流式请求失败且重试1次仍失败
- **THEN** 自动切换到非流式 `/api/ai/generate` 接口
- **AND** 非流式结果正常显示

## MODIFIED Requirements

### Requirement: createSSE 返回值

`createSSE` 返回值从 `{ close: () => controller.abort() }` 改为直接返回 close 函数 `() => controller.abort()`，与 `sseState.close()` 调用方式一致。
