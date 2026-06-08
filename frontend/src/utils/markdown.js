// Markdown极简渲染: 代码块+行内代码+加粗 | 数据流: 原始markdown字符串 → HTML字符串 → v-html

// HTML实体转义，防止XSS
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 渲染极简markdown：代码块(```)、行内代码(`)、加粗(**)
 * @param {string} text - 原始markdown文本
 * @returns {string} HTML字符串
 */
export function renderMarkdown(text) {
  if (!text) return ''
  // 先处理代码块，避免内部内容被后续规则误处理
  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const cls = lang ? ` class="language-${lang}"` : ''
    return `<pre${cls}><code>${escapeHtml(code.trim())}</code></pre>`
  })
  // 处理行内代码（`code`），不影响代码块内的内容
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  // 处理加粗
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return html
}
