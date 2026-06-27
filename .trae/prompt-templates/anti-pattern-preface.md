## 反模式清单（以下做法绝对禁止）

❌ 禁止1：在组件 script 内直接写 API 调用（fetch/axios/EventSource）
❌ 禁止2：在组件内做超过3行的数据转换/计算逻辑
❌ 禁止3：async 函数不 catch 错误
❌ 禁止4：timerId/SSE/AbortController 不做 onUnmounted 清理
❌ 禁止5：一个文件超过200行不拆分
❌ 禁止6：函数超过30行不拆分

## 架构分层（必须遵守）

视图层(.vue) → Composable → API层(api/*.js) → 后端
- 视图层：只渲染 + 事件转发
- Composable：业务逻辑 + 状态管理
- API层：HTTP通信，不处理业务

## 文件规模限制

- .vue 文件 ≤ 200行
- 函数 ≤ 30行
- composable ≤ 150行
- api 文件 ≤ 50行
- controller ≤ 150行

请根据以上约束生成代码。如果约束与功能冲突，优先拆分文件/提取函数，不要违反约束。
