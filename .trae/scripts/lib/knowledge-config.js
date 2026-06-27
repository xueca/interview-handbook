// 文件功能: 加载知识过滤配置 | 数据流: filter.js → 读取 JSON 配置 → 返回配置对象
const fs = require('fs');
const path = require('path');

const FILTER_CONFIG_PATH = path.resolve(__dirname, '..', '..', 'knowledge-filter.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(FILTER_CONFIG_PATH, 'utf-8'));
  } catch (e) {
    throw new Error(`无法读取知识过滤配置: ${e.message}`);
  }
}

module.exports = { loadConfig };
