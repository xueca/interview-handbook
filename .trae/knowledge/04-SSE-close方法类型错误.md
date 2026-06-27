# SSE close 方法类型错误

> 来源: `specs/fix-sse-close-type`
> 标签: #SSE #TypeError #类型契约 #AbortController
> 日期: 2026-06

---

## 问题根因

点击"快捷出题"时抛出 `TypeError: sseState.close is not a function`。

**直接原因**：`createSSE` 返回的是 `{ close: () => controller.abort() }`（一个**对象**），但 `useAiChat.js` 中把它当作**函数**调用：

```js
// 赋值时：sseState.close = { close: fn }  ← 对象
sseState.close = generateStream(input, onMessage, onError)

// 调用时：sseState.close()  ← 当函数调用 → TypeError
function abortCurrent() { sseState.close(); sseState.close = null }
```

**深层原因**：API 返回值类型契约不明确。`createSSE` 的设计者认为"返回一个对象更可扩展"，但调用方 `useAiChat` 的设计者认为"close 就是一个函数"。两个设计决策没有对齐，也没有类型检查。

---

## 解决方案

### 修复 1：统一类型契约

`createSSE` 返回值从 `{ close: () => controller.abort() }` 改为直接返回函数 `() => controller.abort()`：

```js
// 修改前
export function createSSE(url, body, onMessage, onError) {
  const controller = new AbortController()
  fetch(url, { ... }).then(...).catch(onError)
  return { close: () => controller.abort() }  // 对象
}

// 修改后
export function createSSE(url, body, onMessage, onError) {
  const controller = new AbortController()
  fetch(url, { ... }).then(...).catch(onError)
  return () => controller.abort()  // 函数
}
```

### 修复 2：防御性检查

`abortCurrent()` 增加类型检查，确保 `sseState.close` 是可调用的：

```js
function abortCurrent() {
  if (typeof sseState.close === 'function') {
    sseState.close()
    sseState.close = null
  }
}
```

### 修复 3：错误降级

按 SSE 契约手册补充"切非流式"降级：流式失败 → 重试 1 次 → 仍失败 → 自动切换到非流式 `/api/ai/generate` 接口。

---

## 如何避免再次发生

1. **返回值类型契约要明确写在函数注释中**：
   ```js
   /**
    * 创建 SSE 连接
    * @returns {Function} close - 关闭连接的中止函数，直接可调用
    */
   ```
2. **调用方加防御性检查**：不假设返回值一定是某种类型，用 `typeof` 或可选链 `?.()` 保护。
3. **类型检查工具**：如果项目用了 TypeScript，这个问题会在编译期发现。即使不用 TS，也应该在 JSDoc 中标注 `@returns {Function}`，让 IDE 提示。
4. **"可扩展" vs "简单"的权衡**：`{ close: fn }` 比 `fn` 更可扩展，但当前只有 `close` 一个方法，用对象过度设计了。遵循 YAGNI 原则：不需要的时候，不要加。
5. **回归测试**：每次修改 SSE 相关代码后，必须测试"正常流式"和"中断后重试"两个场景，确保 `close` 方法正常工作。