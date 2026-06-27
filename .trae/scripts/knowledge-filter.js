#!/usr/bin/env node
// 文件功能: 知识沉淀候选两层过滤 CLI | 数据流: JSON 输入 → 过滤引擎 → 决策输出 + 审计日志
const fs = require('fs');
const path = require('path');

const { loadConfig } = require('./lib/knowledge-config.js');
const { runFilter } = require('./lib/knowledge-engine.js');
const { logAudit } = require('./lib/knowledge-audit.js');

function filterKnowledge(item, options = {}) {
  const config = loadConfig();
  const id = options.id || `kb-${Date.now()}`;
  const decision = runFilter(item, config);
  if (options.log !== false) logAudit(id, item, decision);
  return decision;
}

function printHelp() {
  console.log('用法: node .trae/scripts/knowledge-filter.js <input.json>');
  console.log('');
  console.log('input.json 格式:');
  console.log(JSON.stringify({
    problem: '问题描述',
    rootCause: '根因',
    solution: '解决方案',
    filesInvolved: ['frontend/src/views/A.vue'],
    diffStats: { added: 10, removed: 2 }
  }, null, 2));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (!args[0]) {
    console.error('错误: 请提供输入 JSON 文件路径');
    process.exit(1);
  }

  const absInputPath = path.resolve(args[0]);
  if (!fs.existsSync(absInputPath)) {
    console.error(`错误: 文件不存在 ${absInputPath}`);
    process.exit(1);
  }

  const item = JSON.parse(fs.readFileSync(absInputPath, 'utf-8'));
  const decision = filterKnowledge(item, { id: `cli-${Date.now()}` });
  console.log(JSON.stringify(decision, null, 2));
}

module.exports = { filterKnowledge };

if (require.main === module) {
  main();
}
