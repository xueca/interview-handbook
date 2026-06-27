- [x] `frontend/src/api/sse.js` 中 `AbortError` 被正确过滤，不触发 `onError`

- [x] `backend/controllers/aiController.js` 中新增 `parseEvents` 函数 ≤ 30 行

- [x] `backend/controllers/aiController.js` 中 `handleStreamResponse` 使用 `parseEvents` 管理 buffer，不丢失被截断的数据

- [x] `backend/controllers/aiController.js` 文件总行数 ≤ 150 行

- [x] `frontend/src/composables/useAiChat.js` 中新增 `extractJSON` 辅助函数，能清洗 markdown 代码块并提取有效 JSON

- [x] `frontend/src/composables/useAiChat.js` 中 `tryParseQuestion` 增强兼容性（answer 支持 string/number，options 支持多种格式）

- [x] 流式响应 `status === 'done'` 时，AI 返回含 markdown 或不完整 JSON 仍能正确解析为题目卡片

- [x] 非流式降级 `fallbackToNonStream` 时，题目也能正确格式化显示

- [x] `frontend/src/api/sse.js` 函数行数 ≤ 30 行，无未使用变量

- [x] `frontend/src/composables/useAiChat.js` 无 ESLint Error（未使用变量、空块语句等）

- [x] ESLint 0 Error

- [x] AI 出题后 JSON 完整解析，正确显示为题目卡片（非原始 JSON 文本）

- [x] 网络较差降级到非流式时，题目仍能正确显示为卡片
