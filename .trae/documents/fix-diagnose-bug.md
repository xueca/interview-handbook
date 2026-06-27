# Diagnose.sh 脚本 Bug 修复计划

## Summary

脚本 `scripts/diagnose.sh` 输出 `✅ Git 仓库存在` 后中止，只输出了 [1/8] 的第一行检查结果。根因是 `set -e`（遇到错误立即退出）与未初始化的计数器变量之间的冲突。

---

## Current State Analysis

### Bug 根因

脚本开头的计数函数使用了自增运算，但变量未被显式初始化为 0：

```bash
ok()   { echo -e "  ${GREEN}✅${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}❌${NC} $1"; ((FAIL++)); ((TOTAL--)); }
```

在 Bash 中，`((PASS++))` 当 `PASS` 未初始化时：
1. 先取值（取默认值 0）
2. 然后 `PASS` 变成 1
3. 表达式结果 = 0
4. `((0))` 的退出码 = **1**（非零值才是成功）
5. `set -e` 生效 → 脚本立即退出

所以诊断流程是：
1. `ok "Git 仓库存在"` → echo 输出文本 ✅
2. `((PASS++))` → PASS 从未初始化到 1，表达式值 0 → 退出码 1
3. `set -e` 阻止脚本继续 → 后续所有检查都不执行

这就是为什么只输出了第一行。

### 为什么第一个 `ok` 的输出能被看到？

因为 `echo -e` 在 `((PASS++))` **之前**执行，文本已经写到 stdout 了，然后 `((PASS++))` 才触发 `set -e` 退出。

---

## Proposed Changes

### 改动 1：初始化所有计数器变量

在函数定义之后、任何检查之前，添加显式初始化：

```bash
# ─── 计数器初始化（必须放在函数定义之后、检查之前）───
PASS=0
FAIL=0
TOTAL=0
```

---

## Verification Steps

### 本地验证

```bash
bash -n scripts/diagnose.sh
```
预期：无输出（语法正确）

### 模拟验证

创建一个最小的测试脚本验证修复是否有效：

```bash
cat > /tmp/test-set-e.sh << 'EOF'
set -e
ok()   { echo "  ✅ $1"; ((PASS++)); }
fail() { echo "  ❌ $1"; ((FAIL++)); }
PASS=0; FAIL=0  # 关键修复

echo "[1/2] 测试"
ok "第一条"
ok "第二条"
echo "完成"
EOF
bash /tmp/test-set-e.sh
```

修复前：只输出第一条 ✅，之后脚本中止
修复后：两条 ✅ 都显示，最后输出"完成"
