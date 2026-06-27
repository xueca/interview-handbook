# Skill 优化计划（剩余步骤）

## 摘要

基于之前的优化计划，已完成 Step 1-3（新建 quick-fix、complex-coder，迁移教学知识）。本计划专注于剩余步骤：精简 3 个高冗余 Skill + 删除 2 个旧 Skill。

## 当前状态

| Skill | 当前行数 | 目标行数 | 状态 |
|-------|---------|---------|------|
| quick-fix | 48行 | 45-50行 | ✅ 已完成 |
| complex-coder | 78行 | 75-80行 | ✅ 已完成 |
| teach-interview-handbook | 319行 | 130-150行 | ❌ 待精简 |
| verify-refactor | 102行 | 50-55行 | ❌ 待精简 |
| interview-drill | 240行 | 170-180行 | ❌ 待精简 |
| generate-with-constraints | 112行 | 0（删除） | ❌ 待删除 |
| refactor-shit-mountain | 92行 | 0（删除） | ❌ 待删除 |

## 实施步骤

### Step 4：精简 teach-interview-handbook（P1）

**文件**：`.trae/skills/teach-interview-handbook/SKILL.md`

**当前问题**：
- 第54-62行：项目架构速查（与 rules 01 重复）→ 删除
- 第77-196行：模块1/5/8/9教学要点（约120行）→ 已迁移到 knowledge 目录，应删除
- 第240-310行：完整教学示例（70行）→ 精简为框架示例

**优化策略**：
1. 删除"项目架构速查"段落（第54-62行）
2. 删除"模块1/5/8/9教学要点"（第77-196行，约120行）
3. 新增"知识加载指令"段落，引导 AI 动态读取 knowledge 文件
4. 精简教学示例（70行 → 20行框架示例）
5. 保留"9大模块表格"但精简为简洁列表

**目标行数**：130-150行

### Step 5：精简 verify-refactor（P1）

**文件**：`.trae/skills/verify-refactor/SKILL.md`

**当前问题**：
- 第24-31行："验证前必读"要求读取 rules 文件 → 删除（rules 已自动加载）
- 第34-66行：自动化检查+架构合规+SSE专项+代码质量 → 与 Code Guardian 重叠
- 第67-97行：验证报告格式（29行）→ 精简

**优化策略**：
1. 删除"验证前必读"段落（第24-31行）
2. 自动化检查改为一行：调用 `code-guardian:full_health_check`
3. 删除"架构合规检查"和"代码质量检查"（Code Guardian 已覆盖）
4. 保留"SSE专项检查"（Code Guardian 不覆盖业务逻辑验证）
5. 精简验证报告格式为关键字段
6. 新增"交叉验证重点"段落（区别于 Code Guardian 的独特价值）

**目标行数**：50-55行

### Step 6：精简 interview-drill（P2）

**文件**：`.trae/skills/interview-drill/SKILL.md`

**当前问题**：
- 第163-230行：答案锚点（68行）过于详细 → 精简为关键词提示
- 第87-161行：执行流程示例输出 → 精简

**优化策略**：
1. 答案锚点从完整句子改为关键词提示（68行 → 35行）
2. 执行流程精简示例输出（保留核心格式，删除冗长示例）
3. 保留题库内容（核心资产）

**目标行数**：170-180行

### Step 7：删除旧 Skill（P3）

**操作**：
1. 确认 complex-coder 完全可用后，删除 `generate-with-constraints` 目录
2. 删除 `refactor-shit-mountain` 目录

## Token 节省量预估

| Skill | 优化前 | 优化后 | 节省 |
|-------|-------|-------|------|
| teach-interview-handbook | 319行 | 140行 | 179行 |
| verify-refactor | 102行 | 53行 | 49行 |
| interview-drill | 240行 | 175行 | 65行 |
| generate-with-constraints | 112行 | 0（删除） | 112行 |
| refactor-shit-mountain | 92行 | 0（删除） | 92行 |
| **总计** | **865行** | **368行** | **497行（-57%）** |

## 验证方式

每个 skill 完成后进行触发测试：
- teach："教我SSE" → 确认读取 knowledge 文件并正确讲解
- verify-refactor："验证重构结果" → 确认调用 Code Guardian + 交叉验证流程
- interview-drill："考我SSE" → 确认题目和答案质量

## 实施顺序

1. **Step 4**：精简 teach-interview-handbook（节省量最大）
2. **Step 5**：精简 verify-refactor（逻辑简单）
3. **Step 6**：精简 interview-drill（答案锚点精简）
4. **Step 7**：删除旧 Skill（最后执行，确保新 Skill 可用）
