// 文件功能: 知识过滤审计日志 | 数据流: 过滤决策 → 追加写入 jsonl
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const AUDIT_LOG_PATH = path.join(PROJECT_ROOT, '.trae', 'workflow-bridge', 'knowledge-audit.jsonl');

function ensureAuditLog() {
  const dir = path.dirname(AUDIT_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(AUDIT_LOG_PATH)) fs.writeFileSync(AUDIT_LOG_PATH, '', 'utf-8');
}

function logAudit(id, item, decision) {
  ensureAuditLog();
  const entry = {
    time: new Date().toISOString(),
    id,
    problem: item.problem?.slice(0, 100) || '',
    action: decision.action,
    score: decision.score,
    matchedTags: decision.matchedTags,
    reason: decision.reason
  };
  fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n', 'utf-8');
}

module.exports = { logAudit };
