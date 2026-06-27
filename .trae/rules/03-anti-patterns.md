---
alwaysApply: true
---

# 反模式清单（禁止操作，不可违反）

> 版本: v3.0 | 项目: 面试宝典（Interview Handbook）
> 本规则始终生效。任何代码生成、修改、重构操作都必须遵守。

## 6种绝对禁止的操作

1. **在组件内直接写API调用**
   - ❌ 禁止：在 .vue 文件里写 fetch/axios/EventSource
   - ✅ 必须：走 composable → api 层

2. **超过3行的数据转换写在组件内**
   - ❌ 禁止：在 .vue 里做复杂map/filter/reduce
   - ✅ 必须：抽成 composable 或 util 函数

3. **async函数不catch错误**
   - ❌ 禁止：裸 async/await 无 try-catch
   - ✅ 必须：每个异步操作都有错误处理

4. **timer/SSE/AbortController不清理**
   - ❌ 禁止：setInterval/setTimeout/AbortController 不清理
   - ✅ 必须：在 onUnmounted 中清理

5. **模块级变量持有组件状态**
   - ❌ 禁止：.js 文件顶层定义 let currentStream = null
   - ✅ 必须：状态放 composable 的 ref/reactive 中

6. **重复代码不抽取**
   - ❌ 禁止：同一逻辑在3个以上地方重复
   - ✅ 必须：抽成 composable / util / 子组件

## 裁决规则

当"实现更简单"与"反模式清单"冲突时，**听反模式的**。这是屎山的起点。
