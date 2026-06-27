# 模块1：JWT认证体系 — 教学要点

## 设计思路

- 为什么用JWT？→ 无状态，不需要服务端存session，适合分布式部署
- 为什么用bcrypt？→ 不可逆哈希，即使数据库泄漏密码也不会暴露
- 为什么token存localStorage而不是cookie？→ 演示项目求简单，生产应换httpOnly cookie

## 数据流

```
注册/登录 → 后端签发JWT → 前端存localStorage → Axios拦截器自动附加Authorization头 → 后端auth中间件验证 → 401自动跳转登录页
```

## 面试模拟

- Q: "JWT怎么防止被伪造？" → Signature段用密钥签名，没有密钥无法生成有效签名
- Q: "token过期了怎么办？" → 当前实现无refresh token，生产环境应加两个token（access短+refresh长）
- Q: "401拦截器的处理逻辑？" → 响应拦截器检测401 → 清除localStorage → 硬跳转登录页（不用router.push是因为需要清除内存中的store状态）
