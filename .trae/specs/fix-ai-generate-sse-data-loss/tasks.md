# Tasks

- [x] Task 1: 前端过滤 AbortError
  - [x] SubTask 1.1: 修改 `frontend/src/api/sse.js` 的 `catch` 块，检查 `e.name === 'AbortError'`，如果是则静默返回，不调用 `onError`
  - [x] SubTask 1.2: 确保 `reader.read().catch` 同样过滤 `AbortError`

- [x] Task 2: 后端提取 parseEvents 辅助函数
  - [x] SubTask 2.1: 在 `backend/controllers/aiController.js` 中创建 `parseEvents(buffer)` 函数，按 `\n\n` 分隔 buffer 为事件数组和不完整尾部
  - [x] SubTask 2.2: `parseEvents` 对每个完整事件调用 `parseStreamChunk`，累加所有 content
  - [x] SubTask 2.3: `parseEvents` 返回 `{ content, remaining }`，`remaining` 为未解析完整的数据

- [x] Task 3: 后端修改 handleStreamResponse 使用 parseEvents
  - [x] SubTask 3.1: 将 `handleStreamResponse` 中的 `const content = parseStreamChunk(buffer)` 替换为 `const result = parseEvents(buffer)`
  - [x] SubTask 3.2: 将 `buffer = ''` 替换为 `buffer = result.remaining`
  - [x] SubTask 3.3: 条件从 `if (content)` 改为 `if (result.content)`

- [x] Task 4: 修复前端 JSON 解析容错（核心问题：AI 出题有时不生成格式化题目）
  - [x] SubTask 4.1: 在 `frontend/src/composables/useAiChat.js` 中提取 `extractJSON(str)` 辅助函数，支持清洗 markdown 代码块标记（```json ... ```）并提取内部 JSON
  - [x] SubTask 4.2: 增强 `tryParseQuestion` 的字段兼容性：answer 支持 number 和 string，options 支持 string[] 和 object[]
  - [x] SubTask 4.3: 在 `status === 'done'` 处理中，若 `tryParseQuestion` 失败，先尝试 `extractJSON` 再解析，增加解析成功率
  - [x] SubTask 4.4: `fallbackToNonStream` 同样使用增强后的解析逻辑，确保降级后的题目也能正确格式化

- [x] Task 5: 修复 ESLint 错误
  - [x] SubTask 5.1: 拆分 `frontend/src/api/sse.js` 的 `createSSE` 内部逻辑，提取 `processBuffer` 辅助函数，使 `createSSE` ≤ 30 行
  - [x] SubTask 5.2: 修复 `sse.js` 和 `useAiChat.js` 中未使用变量 `e` 和空块语句问题

- [x] Task 6: 验证
  - [x] SubTask 6.1: 运行 `npx eslint` 确认 0 Error
  - [x] SubTask 6.2: 运行文件大小检查确认 `aiController.js` ≤ 150 行、`useAiChat.js` ≤ 150 行、`sse.js` ≤ 150 行
  - [x] SubTask 6.3: 编写单元测试验证 `extractJSON` 和 `tryParseQuestion` 对 markdown 包裹的 JSON 仍能正确解析为题目
  - [x] SubTask 6.4: 代码审查确认网络较差降级到非流式时，`fallbackToNonStream` 使用增强后的解析逻辑，题目仍能正确格式化

# Task Dependencies
- Task 2 和 Task 1 无依赖，可并行
- Task 3 依赖 Task 2
- Task 4 和 Task 5 无依赖，可并行
- Task 6 依赖 Task 1, 2, 3, 4, 5
