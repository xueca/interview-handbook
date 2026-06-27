// 文件功能: Workflow Bridge CLI | 数据流: AI Agent → bridge.js → JSON 文件 → AI Agent
// 提供 status/archive/init 三个便捷操作，读取/写入 JSON 由 AI 原生工具直接完成
const fs = require('fs');
const path = require('path');

const BRIDGE_DIR = __dirname;
const PLAN_FILE = path.join(BRIDGE_DIR, 'current-plan.json');
const CONTEXT_FILE = path.join(BRIDGE_DIR, 'context.json');
const HISTORY_DIR = path.join(BRIDGE_DIR, 'history');

// 读取 JSON 文件，不存在返回 null
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

// 写入 JSON 文件
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 生成归档文件名: plan-{id}-{date}.json
function archiveFilename(plan) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const id = (plan && plan.id) ? plan.id : 'unknown';
  return `plan-${id}-${date}.json`;
}

// 创建空计划模板
function emptyPlan() {
  return {
    id: null, title: null, source: null, createdAt: null,
    summary: null, tasks: [], entryFile: null, notes: null,
    status: 'empty', schema_version: '1.1'
  };
}

// ---- 命令处理 ----

const cmd = process.argv[2];

// status: 打印当前 Bridge 状态摘要
function cmdStatus() {
  const plan = readJSON(PLAN_FILE);
  const ctx = readJSON(CONTEXT_FILE);
  const historyFiles = fs.existsSync(HISTORY_DIR)
    ? fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'))
    : [];

  console.log('=== Workflow Bridge 状态 ===');
  console.log('');

  // 当前计划
  if (plan && plan.status !== 'empty') {
    console.log(`📋 当前计划: ${plan.title} [${plan.status}]`);
    console.log(`   来源: ${plan.source || '未知'} | 创建: ${plan.createdAt || '未知'}`);
    console.log(`   概要: ${plan.summary || '无'}`);
    console.log(`   任务: ${plan.tasks.length} 个 | 入口文件: ${plan.entryFile || '无'}`);
    console.log('   涉及文件链由 Project Context find_related_files 动态提供');
    if (plan.notes) console.log(`   备注: ${plan.notes}`);
  } else {
    console.log('📋 当前计划: 无待执行计划');
  }

  // 上下文
  if (ctx) {
    console.log('');
    console.log(`📝 上次任务: ${ctx.lastTask || '无'}`);
    if (ctx.lastModifiedFiles && ctx.lastModifiedFiles.length > 0) {
      console.log(`   修改文件: ${ctx.lastModifiedFiles.join(', ')}`);
    }
    if (ctx.warnings && ctx.warnings.length > 0) {
      console.log(`   ⚠️ 注意事项: ${ctx.warnings.length} 条`);
      ctx.warnings.forEach((w, i) => console.log(`      ${i + 1}. ${w}`));
    }
  }

  // 历史归档
  console.log('');
  console.log(`📦 历史归档: ${historyFiles.length} 个`);
  if (historyFiles.length > 0) {
    historyFiles.slice(-5).forEach(f => console.log(`   - ${f}`));
    if (historyFiles.length > 5) console.log(`   ... 还有 ${historyFiles.length - 5} 个`);
  }

  console.log('');
  console.log(`🕐 检查时间: ${new Date().toISOString()}`);
}

// archive: 归档当前计划到 history/，重置 current-plan.json
function cmdArchive() {
  const plan = readJSON(PLAN_FILE);
  if (!plan || plan.status === 'empty') {
    console.log('❌ 没有可归档的计划（current-plan.json 为空）');
    process.exit(1);
  }

  // 标记为已完成
  plan.status = 'archived';
  plan.archivedAt = new Date().toISOString();

  // 写入 history/
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  const filename = archiveFilename(plan);
  writeJSON(path.join(HISTORY_DIR, filename), plan);

  // 重置 current-plan.json
  writeJSON(PLAN_FILE, emptyPlan());

  console.log(`✅ 已归档: ${filename}`);
  console.log(`   current-plan.json 已重置为空`);
}

// init: 初始化所有文件（如果不存在则创建默认值）
function cmdInit() {
  if (!fs.existsSync(PLAN_FILE)) {
    writeJSON(PLAN_FILE, emptyPlan());
    console.log('✅ 已创建 current-plan.json');
  } else {
    console.log('⏭️  current-plan.json 已存在，跳过');
  }

  if (!fs.existsSync(CONTEXT_FILE)) {
    writeJSON(CONTEXT_FILE, {
      lastTask: null, lastModifiedFiles: [], warnings: [],
      activePlan: null, updatedAt: new Date().toISOString(),
      schema_version: '1.0'
    });
    console.log('✅ 已创建 context.json');
  } else {
    console.log('⏭️  context.json 已存在，跳过');
  }

  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    console.log('✅ 已创建 history/ 目录');
  } else {
    console.log('⏭️  history/ 目录已存在，跳过');
  }

  console.log('✅ Workflow Bridge 初始化完成');
}

// 路由
switch (cmd) {
  case 'status':
    cmdStatus();
    break;
  case 'archive':
    cmdArchive();
    break;
  case 'init':
    cmdInit();
    break;
  default:
    console.log('用法: node bridge.js <命令>');
    console.log('');
    console.log('命令:');
    console.log('  status    查看 Bridge 状态摘要');
    console.log('  archive   归档当前计划到 history/');
    console.log('  init      初始化所有文件（幂等）');
    console.log('');
    console.log('读取/写入 JSON: AI 直接用 Read/Write 工具操作以下文件');
    console.log(`  计划文件: ${PLAN_FILE}`);
    console.log(`  上下文:   ${CONTEXT_FILE}`);
    console.log(`  归档目录: ${HISTORY_DIR}`);
    process.exit(0);
}