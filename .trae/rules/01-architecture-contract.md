---
alwaysApply: true
---

# 架构分层契约（不可违反）

> 版本: v3.0 | 项目: 面试宝典（Interview Handbook）
> 本规则始终生效。任何代码生成、修改、重构操作都必须遵守。

## 数据流方向（单向，禁止反向）

```
views/*.vue  →  composables/use*.js  →  api/*.js  →  backend
     ↑              ↓ 返回响应式数据      ↓ 返回Promise
     └──────────────┴────────────────────┘
```

## 各层职责与禁令

### 视图层（views/*.vue）
- ✅ 只做：渲染UI + 事件转发 + 调用composable
- ❌ 禁止：直接写 fetch/axios/EventSource/new EventSource() [GOLDEN_RULE_001] 视图层禁止直接写 fetch/axios
- ❌ 禁止：做score计算、sort排序、API返回值清洗
- ❌ 禁止：超过3行的数据转换
- ❌ 禁止：async函数不catch错误

### Composable层（composables/use*.js）
- ✅ 只做：业务逻辑 / 状态管理 / 资源清理 / 异常处理
- ❌ 禁止：操作DOM / 直接fetch / 不清理timer/SSE/AbortController

### API层（api/*.js）
- ✅ 只做：HTTP通信（request.js封装）
- ❌ 禁止：处理业务逻辑 / 操作状态

### 后端层（routes/*.js → controllers/*.js → data/index.js）
- ✅ 只做：API路由 / 业务实现 / 数据持久化
- ❌ 禁止：controller超过150行

## 依赖方向（绝对禁止反向）

- Service/api层 不准 import 视图层组件
- Store 不准 import 视图层
- 类型/工具函数 不准 import 任何业务层

## 裁决规则

当"效率"与"分层"冲突时，**听分层的**。直接fetch=破窗效应，下次AI也会这么干。
