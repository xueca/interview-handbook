# 模块8：SSE流式AI出题（⭐⭐⭐⭐⭐ 最核心亮点）— 教学要点

## 设计思路

1. **为什么选择SSE而不是WebSocket？**
   - AI生成是单向流（后端→前端），不需要双向通信
   - SSE基于HTTP协议，更轻量，天然支持自动重连
   - 部署不需要额外的WebSocket服务器配置

2. **为什么后端做一层代理而不是前端直连DeepSeek？**
   - API Key不能暴露在前端（安全性）
   - 可以做限流、日志、内容过滤（可控性）
   - 前端接口与AI模型解耦，换模型不影响前端（可维护性）

3. **为什么用fetch+ReadableStream而不是EventSource？**
   - EventSource只支持GET请求，不能传消息体和自定义Header
   - AI对话需要POST发送历史消息，必须用fetch
   - EventSource不支持自定义Authorization头

## 数据流（完整路径）

```
用户输入"出一道闭包面试题"
  → AiChat.vue: handleQuickGenerate()
    → useAiChat.js: generateQuestions()
      → push user消息 + push assistant消息(type='pending')
      → callSSE('generate', prompt)
        → api/ai.js: generateStream()
          → api/sse.js: fetch POST /api/ai/generate/stream
            → AbortController.signal 绑定（用于"停止生成"按钮）
            → ReadableStream.getReader() 逐块读取

══════════ 网络边界 ══════════

后端 aiController.js:
  → streamDeepSeek(prompt, 'generate', res)
    → https.request → DeepSeek API (stream:true)
      → handleStreamResponse:
        收到第1个chunk → 发送 { type:'status', status:'thinking' }
        后续chunks → aiParser.parseStreamChunk → 提取 delta.content
                    → 过滤 reasoning_content
                    → 发送 { type:'content', content }
        流结束 → 发送 { type:'status', status:'done' }

前端 onMessage 回调:
  thinking → last.type = 'thinking'（🤔思考中动画）
  content → 逐字追加 last.content（打字机效果+光标闪烁）
          → last.type = 'generating'
  done → tryParseQuestion(last.content)
        → 成功: last.type='question', last.parsed=对象（格式化卡片）
        → 失败: last.type='text'（降级为普通文本）
```

## 三层架构分工

| 层 | 文件 | 只做什么 | 禁止做什么 |
|----|------|---------|-----------|
| API层 | sse.js | HTTP连接+逐帧解析 | 处理业务状态（messages数组） |
| 业务层 | useAiChat.js | 状态管理+SSE消费+持久化 | 操作DOM |
| 视图层 | AiChat.vue | 渲染+事件转发 | 直接处理SSE/操作messages数组 |

## 思考动画三阶段

| 阶段 | msg.type | UI显示 | 触发条件 |
|------|---------|--------|---------|
| 等待 | pending | 空（刚发送） | 消息刚push |
| 思考中 | thinking | 🤔 正在思考题目... | 后端发送 thinking 状态 |
| 生成中 | generating | 流式文本 + ▋光标 | 收到第一个content |
| 完成-题目 | question | 格式化题目卡片 | JSON解析成功 |
| 完成-文本 | text | 普通文本 | JSON解析失败 |

## 面试模拟

- Q: "SSE流式输出是怎么实现的？" → 回答数据流图的简化版 + 强调三层架构的分工
- Q: "遇到最大的技术困难是什么？" → 说Vite代理SSE超时（proxyTimeout必须设0）+ SSE分帧截断（中文多字节字符被截断）+ DeepSeek V4 reasoning_content混入
- Q: "怎么防止快速点击导致的竞态条件？" → useAiChat中的abortCurrent()，每次新请求前中止旧连接
- Q: "为什么把prompt和parser拆到单独文件？" → 行数限制要求controller≤150行 + 单一职责原则
- Q: "思考动画的三阶段是怎么实现的？" → 后端发thinking信号触发阶段切换，前端通过msg.type条件渲染

## 踩坑记录

旧架构映射：
| 坑 | 旧代码 | 当前代码对应 |
|----|-------|-------------|
| Vite代理SSE超时 | EventSource | `api/sse.js` + `vite.config.js` proxyTimeout:0 |
| AI格式不稳定 | AiChat.vue内tryParseQuestions | 后端`aiParser.js` repairJSON + 前端`useAiChat.js` tryParseQuestion |
| 全局状态污染 | 全局isStreamingDone | 每条消息独立type字段 |
| Vue响应性丢失 | newMsg普通对象 | `messages.value[i]`获取proxy |

当前架构新增：
| 坑 | 文件 | 核心解法 |
|----|------|---------|
| SSE分帧截断/中文多字节 | `api/sse.js`第26行 | `decoder.decode(value, {stream:true})` + `buffer=lines.pop()` |
| V4 reasoning_content混入 | `aiParser.js`第48行 | `if(delta?.content)`过滤reasoning_content |
| AbortController竞态条件 | `useAiChat.js`第57行 | `abortCurrent()`每次新请求前中止旧连接 |

面试讲坑策略：先讲1-2个旧坑展示排查思路，再讲1个新坑展示独家踩坑经验。
