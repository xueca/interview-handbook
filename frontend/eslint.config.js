import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import architecture from './eslint-plugin-architecture/index.js'

export default [
  js.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // 文件规模约束
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      // 反模式约束
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // Vue 规范
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'error',
      // 代码风格（适应现有4空格缩进）
      'indent': 'off',
      'vue/html-indent': 'off',
      'quotes': ['error', 'single'],
      'semi': ['error', 'never']
    }
  },

  // API层文件不超过50行
  {
    files: ['src/api/**/*.js'],
    rules: { 'max-lines': ['error', { max: 50 }] }
  },

  // Composable文件不超过150行，工厂函数豁免30行限制（内部为多个小函数聚合）
  {
    files: ['src/composables/**/*.js'],
    rules: { 'max-lines': ['error', { max: 150 }], 'max-lines-per-function': 'off' }
  },

  // 视图层约束
  {
    files: ['src/views/**/*.vue'],
    plugins: { architecture },
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'axios', message: '视图层禁止直接引入 axios' }],
        patterns: [{ group: ['**/utils/sse.js'], message: '视图层禁止直接引入 sse.js' }]
      }],
      'architecture/no-direct-fetch-in-views': 'error'
    }
  },

  { ignores: ['dist/', 'node_modules/'] }
]
