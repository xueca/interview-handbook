* [x] `createSSE` 返回的是函数而非对象，`sseState.close()` 可正常调用

* [x] `abortCurrent` 对 `sseState.close` 做了类型检查，不会因非函数值报 TypeError

* [x] 未登录状态点击"快捷出题"不抛出 `TypeError: sseState.close is not a function`

* [x] SSE 流式失败后自动降级到非流式接口，用户能看到结果

* [x] 正常登录状态流式出题功能不受影响

