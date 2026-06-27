# Skill Token 优化计划

## 摘要

基于 Caveman 蓝图，对现有 6 个 Skill 进行分层优化：新建 2 个按复杂度分级的编码 Skill，精简 3 个高冗余 Skill，合并删除 2 个重复 Skill。预计总行数从 934 行降至 563 行，节省约 40% Token。

## 核心问题

**Rules 与 Skills 职责混淆**：项目 7 个 rules 文件中有 6 个 `alwaysApply: true`（始终生效），但现有 skill 大量复制这些已自动加载的规则内容，造成严重冗余。

| 冗余来源 | 涉及 Skill | 冗余行数 |
|---------|-----------|---------|
| 复制 rules 01/02/03 的约束 checklist | generate / refactor / verify | ~95行 |
| 复制 rule 07 Code Guardian 调用流程 | generate / refactor / verify | ~30行 |
| 硬编码项目知识 + 教学示例 | teach-interview-handbook | ~200行 |
| 答案锚点过于详细 | interview-drill | ~33行 |

## 优化后 Skill 矩阵

| Skill | 类型 | 触发条件 | 目标行数 | 状态 |
|-------|------|---------|---------|------|
| `complex-coder` | 复杂编码 | "生成代码"/"重构"/"拆分"/"实现功能" | 75-80行 | **新建**（合并 generate + refactor） |
| `quick-fix` | 轻量编码 | "修复bug"/"改一下"/"小修改" | 45-50行 | **新建** |
| `teach-interview-handbook` | 教学 | "教我"/"讲一下"/"怎么实现" | 130-150行 | **精简** |
| `interview-drill` | 面试模拟 | "考我"/"模拟面试"/"drill" | 170-180行 | **精简** |
| `verify-refactor` | 交叉验证 | "验证"/"review"/"交叉验证" | 50-55行 | **精简** |
| `caveman` | 输出风格 | "简洁模式"/"caveman"/"少说废话" | 69行 | 不变 |

## 实施步骤

### Step 1：新建 quick-fix（P0，零风险）

**文件**：`.trae/skills/quick-fix/SKILL.md`（45-50行）

**核心设计**：
- 触发：修改范围 ≤ 2个文件、≤ 50行
- 流程：定位（读文件）→ 修改（调 Code Guardian）→ 验证（快速检查）
- 升级条件：超过范围自动提示切换到 complex-coder
- 不复制 rules 内容（rules 已始终生效），只提醒"遵守 rules"
- 输出格式：简要说明改了什么 + 为什么 + 验证结果

### Step 2：新建 complex-coder（P0，合并 generate + refactor）

**文件**：`.trae/skills/complex-coder/SKILL.md`（75-80行）

**核心设计**：
- 两种模式：新功能（从零创建）+ 重构（改造已有）
- 四阶段流程：诊断 → 设计（必做，等确认）→ 执行（按依赖顺序）→ 验证
- 新功能执行顺序：api → composable → view
- 重构执行顺序：建 composables → 创建 useXxx → 拆 controller → 精简 .vue
- Code Guardian 调用改为引用 rule 07
- 删除所有与 rules 重复的约束 checklist

### Step 3：迁移 teach-interview-handbook 的教学知识（P1）

**操作**：将硬编码的教学要点迁移到 knowledge 目录
- 模块1（JWT）→ `.trae/knowledge/08-JWT认证-教学要点.md`
- 模块5（答题引擎）→ `.trae/knowledge/09-答题引擎-教学要点.md`
- 模块8（SSE）→ `.trae/knowledge/10-SSE流式AI出题-教学要点.md`
- 模块9（AI动画）→ `.trae/knowledge/11-AI思考动画-教学要点.md`

### Step 4：精简 teach-interview-handbook（P1）

**文件**：`.trae/skills/teach-interview-handbook/SKILL.md`（130-150行）

**关键改动**：
- 删除硬编码项目知识（~120行），改为"读取 knowledge 目录"
- 删除架构速查（rules 01 已有）
- 精简教学示例（70行 → 20行框架示例）
- 新增"知识加载指令"段落，引导 AI 动态读取 knowledge 文件

### Step 5：精简 verify-refactor（P1）

**文件**：`.trae/skills/verify-refactor/SKILL.md`（50-55行）

**关键改动**：
- 删除与 Code Guardian 重叠的检查项
- 自动化检查改为一行：调用 `code-guardian:full_health_check`
- 强化独特价值：业务逻辑正确性、接口契约、边界遗漏、数据流完整性
- 验证报告模板精简为关键字段

### Step 6：精简 interview-drill（P2）

**文件**：`.trae/skills/interview-drill/SKILL.md`（170-180行）

**关键改动**：
- 答案锚点从完整句子改为关键词提示（68行 → 35行）
- 执行流程精简示例输出（50行 → 40行）
- 题库内容保留（核心资产）

### Step 7：清理旧 Skill（P3）

- 确认 complex-coder 可用后，删除 `generate-with-constraints` 和 `refactor-shit-mountain`
- 最终确认所有 6 个 skill 触发条件无冲突

## Token 节省量预估

| Skill | 优化前 | 优化后 | 节省 |
|-------|-------|-------|------|
| generate-with-constraints | 112行 | 0（合并） | 112行 |
| refactor-shit-mountain | 92行 | 0（合并） | 92行 |
| complex-coder（新建） | 0 | 78行 | -78行 |
| quick-fix（新建） | 0 | 48行 | -48行 |
| teach-interview-handbook | 319行 | 140行 | 179行 |
| interview-drill | 240行 | 175行 | 65行 |
| verify-refactor | 102行 | 53行 | 49行 |
| caveman | 69行 | 69行 | 0 |
| **总计** | **934行** | **563行** | **371行（-40%）** |

## 触发条件总览（确保无冲突）

| 触发词 | 激活 Skill |
|-------|-----------|
| "生成代码"/"写组件"/"实现功能"/"添加新模块" | complex-coder |
| "重构"/"拆分"/"优化代码"/"清理代码" | complex-coder |
| "修复bug"/"改一下"/"加个小功能"/"调整样式" | quick-fix |
| "教我"/"讲一下"/"怎么实现的"/"分析设计" | teach-interview-handbook |
| "考我"/"模拟面试"/"来拷打"/"drill" | interview-drill |
| "验证"/"review"/"交叉验证" | verify-refactor |
| "简洁模式"/"caveman"/"少说废话" | caveman |

**边界判断**：
- quick-fix vs complex-coder：≤2文件且≤50行 → quick-fix，否则 → complex-coder
- complex-coder vs verify-refactor："做" → complex-coder，"检查别人做的" → verify-refactor
- teach vs interview-drill："学" → teach，"被考" → drill

## 优化原则

1. **Skill 不复制 Rule**：rules 已始终生效，skill 只引用不复制
2. **Skill 只写"流程"不写"约束"**：Rule = 约束（不可做什么），Skill = 流程（按什么步骤做）
3. **项目知识动态加载**：不硬编码在 skill 中，改为读取 knowledge 目录
4. **保持 Skill 独立性**：不同触发条件的 skill 不合并

## 验证方式

每个 skill 完成后进行触发测试：
- quick-fix："修复一个css问题" → 确认轻量流程
- complex-coder："实现一个新功能" + "重构某组件" → 确认两种模式
- teach："教我SSE" → 确认读取 knowledge 文件
- interview-drill："考我SSE" → 确认题目和答案质量
- verify-refactor："验证重构结果" → 确认交叉验证流程
