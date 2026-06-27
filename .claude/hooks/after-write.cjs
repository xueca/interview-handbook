// 文件功能: Claude Code 写操作后 Hook | 数据流: 获取 git 新增文件 → 增量 hard check → 严重违规时 process.exit(1)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CHECK_SCRIPT = path.join(PROJECT_ROOT, 'backend/scripts/check-file-size.js');

// 不检查的目录
const SKIP_DIRS = new Set(['chatgpt-web', 'node_modules', '.git', 'dist']);

function readSafe(file) {
  try { return fs.readFileSync(file, 'utf-8'); } catch { return ''; }
}

function shouldCheck(relPath) {
  const parts = relPath.split(/[/\\]/);
  return !parts.some(p => SKIP_DIRS.has(p));
}

// 获取 git 新增（untracked）的 .js/.vue 文件
function getNewFiles() {
  try {
    const output = execSync('git status --porcelain', { cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 5000 });
    return output
      .split('\n')
      .filter(line => line.startsWith('??'))
      .map(line => line.slice(3).trim())
      .filter(file => file.endsWith('.js') || file.endsWith('.vue'));
  } catch {
    return null;
  }
}

// 检查单个文件大小
function checkFileSize(relPath) {
  if (!fs.existsSync(CHECK_SCRIPT)) return false;
  try {
    execSync(`node "${CHECK_SCRIPT}" "${relPath}"`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 10000 });
    return false;
  } catch (e) {
    const stderr = e.stderr?.toString().trim();
    if (stderr) console.error(`[Hook] ❌ ${relPath} 文件大小检查未通过:`, stderr);
    return true;
  }
}

// 检查视图层直接 API 调用
function checkDirectApi(relPath, content) {
  if (!relPath.endsWith('.vue')) return false;
  if (/\bfetch\s*\(|\baxios\s*\.|new\s+EventSource\s*\(/.test(content)) {
    console.error(`[Hook] ❌ ${relPath} 视图层存在直接 API 调用`);
    return true;
  }
  return false;
}

// 检查 async 函数无 try-catch
function checkBareAsync(relPath, content) {
  const asyncCount = (content.match(/\basync\s+(function|\(|[a-zA-Z_$])/g) || []).length;
  const tryCatchCount = (content.match(/\btry\s*\{/g) || []).length;
  if (asyncCount > 0 && tryCatchCount === 0) {
    console.error(`[Hook] ❌ ${relPath} 有 ${asyncCount} 个 async 但无任何 try-catch`);
    return true;
  }
  return false;
}

// 检查资源泄露
function checkResourceLeak(relPath, content) {
  const issues = [];
  if (/setInterval\(/.test(content) && !/clearInterval\(/.test(content))
    issues.push('setInterval 未调用 clearInterval');

  if (/new EventSource\(/.test(content)) {
    if (!/\.close\(\)/.test(content)) issues.push('EventSource 未调用 .close()');
    else if (!/onUnmounted/.test(content)) issues.push('EventSource 未在 onUnmounted 中关闭');
  }

  if (/new AbortController\(/.test(content) && !/\.abort\(/.test(content))
    issues.push('AbortController 未调用 .abort()');

  if (issues.length) {
    console.error(`[Hook] ❌ ${relPath} 资源泄露风险: ${issues.join('; ')}`);
    return true;
  }
  return false;
}

// 主流程
const newFiles = getNewFiles();

if (!newFiles) {
  console.log('[Hook] 无法获取 git 状态，跳过检查');
  process.exit(0);
}

if (newFiles.length === 0) {
  console.log('[Hook] 没有新增 .js/.vue 文件，跳过检查');
  process.exit(0);
}

const filesToCheck = [...new Set(newFiles)].filter(shouldCheck);
let failed = false;

filesToCheck.forEach(relPath => {
  const content = readSafe(path.join(PROJECT_ROOT, relPath));
  if (!content) return;

  failed = checkFileSize(relPath) || failed;
  failed = checkDirectApi(relPath, content) || failed;
  failed = checkBareAsync(relPath, content) || failed;
  failed = checkResourceLeak(relPath, content) || failed;
});

if (failed) {
  console.error('[Hook] 新增文件存在严重违规，请先修复后再继续。');
  process.exit(1);
}

console.log(`[Hook] 已检查 ${filesToCheck.length} 个新增文件，无严重违规`);
