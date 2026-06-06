// 自定义 ESLint 插件：禁止在 views 目录直接使用原生 fetch/EventSource
const plugin = {
  rules: {
    'no-direct-fetch-in-views': {
      meta: { type: 'problem', docs: { description: '禁止在 views 目录直接使用 fetch/EventSource', category: 'Architecture' },
        messages: { noDirectFetch: '视图层禁止直接使用 {{name}}，请通过 api/xxx.js 或 composable 调用' } },
      create(context) {
        const filename = context.filename || ''
        if (!filename.includes('/views/') && !filename.includes('\\views\\')) return {}
        return {
          CallExpression(node) {
            if (node.callee.name === 'fetch') context.report({ node, messageId: 'noDirectFetch', data: { name: 'fetch' } })
          },
          NewExpression(node) {
            if (node.callee.name === 'EventSource') context.report({ node, messageId: 'noDirectFetch', data: { name: 'EventSource' } })
          }
        }
      }
    }
  }
}
export default plugin
