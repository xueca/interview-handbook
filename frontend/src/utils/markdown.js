// Markdown极简渲染: 代码块+行内代码+加粗+标题+分隔线 | 数据流: 原始markdown字符串 → HTML字符串 → v-html

// 代码块占位符后缀（Unicode 私有区字符，不会与正文内容冲突）
const BLOCK_MARKER = ''

// HTML实体转义，防止XSS
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 处理行级/行内语法：标题、分隔线、行内代码、加粗（代码块已被占位符保护，不会被误伤）
function renderInline(text) {
  return text
    // 标题 #~######（行首），转成对应 h1~h6
    .replace(/^(#{1,6})\s+(.+?)\s*$/gm, (_, h, t) => `<h${h.length}>${t}</h${h.length}>`)
    // 水平分隔线 --- 或 ***（独占一行）
    .replace(/^\s*(?:-{3,}|\*{3,})\s*$/gm, '<hr>')
    // 行内代码 `code`
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    // 加粗 **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/**
 * 渲染极简markdown：代码块(```)、行内代码(`)、加粗(**)、标题(#)、分隔线(---)
 * @param {string} text - 原始markdown文本
 * @returns {string} HTML字符串
 */
export function renderMarkdown(text) {
  if (!text) return ''
  const blocks = []
  // 先把代码块抽成占位符，避免标题/分隔线/加粗规则破坏代码内容
  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const cls = lang ? ` class="language-${lang}"` : ''
    blocks.push(`<pre${cls}><code>${escapeHtml(code.trim())}</code></pre>`)
    return BLOCK_MARKER + (blocks.length - 1) + BLOCK_MARKER
  })
  html = renderInline(html)
  // 还原代码块占位符
  return html.replace(new RegExp(BLOCK_MARKER + '(\\d+)' + BLOCK_MARKER, 'g'), (_, i) => blocks[Number(i)])
}
