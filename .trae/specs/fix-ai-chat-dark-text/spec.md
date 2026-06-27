# Fix AI Chat Dark Mode Text Visibility Spec

## Why
暗黑模式下 AiChat 页面文字对比度极低，AI 消息内容和标签几乎不可见。根因：`dark.css` 覆盖了聊天消息背景色但未覆盖文字颜色，亮色模式下的 `#303133` 在暗黑背景 `#1d1d1d` 上看不清。

## What Changes
- **`frontend/src/styles/dark.css`**: 新增 AiChat 页面文字颜色覆盖
  - `.message-content` → `#e5eaf3`
  - `.message-role` → `#a3a6ad`
  - `.rec-title` → `#a3a6ad`
  - `.rec-item` → `#e5eaf3`
  - `.thinking-indicator` → `#a3a6ad`
  - `.message-content pre` → 暗黑模式代码块背景

## Impact
- 仅影响 `dark.css` 一个文件
- 仅影响暗黑模式下的 AiChat 页面文字显示
- 不破坏任何现有架构或数据流

## ADDED Requirements
### Requirement: 暗黑模式下聊天消息可读
- **WHEN** 用户切换到暗黑模式并查看 AI 对话页面
- **THEN** 消息文字、角色标签、推荐问题文字应有足够对比度（符合 WCAG 最低标准）
