// 文件功能: 两层过滤引擎 | 数据流: 经验对象 → 黑名单 → 白名单 → 决策
const path = require('path');

function getItemText(item) {
  return `${item.problem || ''} ${item.rootCause || ''} ${item.solution || ''} ${(item.filesInvolved || []).join(' ')}`;
}

// 第一层：黑名单过滤
function layer1Blacklist(item, config) {
  const text = getItemText(item);
  const files = item.filesInvolved || [];

  const codeFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return !config.skip_extensions.includes(ext);
  });
  if (files.length > 0 && codeFiles.length === 0) {
    return { skip: true, reason: '仅非代码文件修改，不沉淀' };
  }

  if (item.diffStats && item.diffStats.added + item.diffStats.removed < config.min_total_lines) {
    return { skip: true, reason: `修改行数 ${item.diffStats.added + item.diffStats.removed} 小于阈值 ${config.min_total_lines}` };
  }

  for (const pattern of config.skip_patterns) {
    if (new RegExp(pattern, 'i').test(text)) {
      return { skip: true, reason: `命中黑名单关键词: ${pattern}` };
    }
  }

  return { skip: false };
}

// 第二层：白名单模式匹配
function layer2Whitelist(item, config) {
  const text = getItemText(item);
  let score = 0;
  const matchedTags = [];

  for (const tag of config.tags) {
    let matchedCount = 0;
    for (const pattern of tag.patterns) {
      if (new RegExp(pattern, 'i').test(text)) matchedCount++;
    }
    if (matchedCount > 0) {
      score += tag.weight * Math.min(matchedCount, 3);
      matchedTags.push(tag.name);
    }
  }

  return { score, matchedTags };
}

// 两层过滤主函数
function runFilter(item, config) {
  const black = layer1Blacklist(item, config.layer1_blacklist);
  if (black.skip) {
    return { action: 'skip', score: 0, matchedTags: [], reason: black.reason };
  }

  const white = layer2Whitelist(item, config.layer2_whitelist);
  const { auto_commit_threshold, pending_threshold } = config.layer2_whitelist;

  if (white.score >= auto_commit_threshold) {
    return { action: 'auto-commit', score: white.score, matchedTags: white.matchedTags, reason: '高置信度匹配' };
  }
  if (white.score >= pending_threshold) {
    return { action: 'pending', score: white.score, matchedTags: white.matchedTags, reason: '中等置信度，等待确认' };
  }
  return { action: 'skip', score: white.score, matchedTags: white.matchedTags, reason: '无高价值标签匹配' };
}

module.exports = { runFilter };
