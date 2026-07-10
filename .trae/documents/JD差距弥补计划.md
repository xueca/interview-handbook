# JD差距弥补计划

> 目标：针对5个差距点，制定面试话术 + 知识补充方案。

---

## 差距1：Testing/Review/Refactor Agent（手动测试后删除）

### 现状
- 没做独立Testing Agent，手动开新对话测试后删除
- 没做Review Agent，Code Guardian替代了部分功能
- 没做Refactor Agent，重构靠人工触发

### 面试话术
> "我的Testing/Review是人工触发的——写完代码开新对话让AI测试，测完删除。Code Guardian MCP做了自动化Review，但Refactor Agent确实没做。下一步是让Code Guardian发现问题后自动触发修复流程，形成检查→修复闭环。"

### 弥补方向（不写代码，只准备话术）
- 承认现状：手动测试不是Agent，是人工操作
- 展示认知：知道Agent需要自主决策循环（observe→think→act）
- 给出设计：如果做Testing Agent，架构是什么（读函数签名→生成测试骨架→跑测试→失败则反馈修复Agent）

---

## 差距2：群组式Agent（投票有分歧延缓进度）

### 现状
- 不了解群组式架构模式
- 做过类似操作：多个Agent对方案投票，但有分歧反而慢

### 面试话术
> "我试过多Agent投票——让几个AI对项目方案各自给意见再投票。问题是分歧时反而延缓进度，没有一个仲裁机制。群组式的关键是需要仲裁策略：多数决、权重投票、或一个Orchestrator Agent做最终决策。我的编排式架构（Trae Solo做Orchestrator）其实就是在解决这个问题——由一个Agent统筹，避免投票僵局。"

### 知识补充
- 群组式（Swarm）：多Agent并行求解同一问题，投票/协商得出结果
- 适合场景：创意方案、风险评估（需要多视角）
- 不适合场景：确定性任务（写代码，对就是对错就是错）
- 你的编排式（Orchestrator）比群组式更适合编码场景

---

## 差距3：单元测试生成（手动测试，不了解AI能力）

### 现状
- AI生成测试能力有限，改为手动测试
- 可能不够了解AI在测试生成方面的能力

### 面试话术
> "当前测试是手写的，AI生成测试质量不稳定——生成的用例覆盖不到边界条件。我设计过自动测试生成架构：解析函数签名推导骨架，基于.code-guardian.json配置生成边界用例，每个检测器生成正例+反例。这是当前缺口，只有手写测试。"

### 知识补充
- AI生成测试的当前能力：能生成骨架+基础用例，但边界用例需人工补充
- 可用工具：GitHub Copilot test生成、Cursor测试生成
- 你的设计思路（签名推导+配置驱动+正反例）是正确的，只是没实现

---

## 差距4：Code Guardian只报告不修复（设计原理）

### 代码确认的设计原理
- 6个Tool各自独立检查，full_health_check聚合5项
- 只输出结构化报告（findings数组），不修改代码
- 配置驱动（.code-guardian.json），每项检查可开关
- 原因：设计为"检查层"而非"修复层"，修复由AI或人决定

### 面试话术
> "Code Guardian设计为只报告不修复——它是检查层，不是修复层。6个Tool各检测一项，full_health_check聚合输出结构化报告。修复决策交给AI或人工，因为有些反模式需要上下文判断（比如资源泄露可能是误报）。下一步是加修复Agent：Code Guardian报告问题→修复Agent读取报告→自动修复→再检查，形成闭环。"

### 关键认知
- 只报告是设计决策，不是缺陷
- 原因：避免误修复（自动修复可能引入新bug）
- 与文章对比：文章的Agent有act能力，Code Guardian只有observe

---

## 差距5：PR和CI/CD概念不清

### 概念速查
- **PR（Pull Request）**：GitHub/GitLab功能，把你的代码分支合并到主分支的"申请"，别人Review后合并
- **CI（Continuous Integration）**：每次push代码自动跑测试+构建，确保不破坏主分支
- **CD（Continuous Deployment）**：CI通过后自动部署到服务器
- **CI/CD流水线**：push → 自动测试 → 自动构建 → 自动部署

### 你的项目现状
- 有Husky pre-commit（本地提交前检查）→ 这是CI的雏形
- 没有GitHub Actions/GitLab CI → 没有远程CI
- 没有自动部署 → 没有CD
- 没有PR流程 → 直接push到main

### 面试话术
> "我的项目有Husky做本地pre-commit检查，算是CI的雏形。但没有接入GitHub Actions做远程CI/CD，也没有PR Review流程。如果要做AI自动生成PR：AI完成代码→跑测试→生成PR描述→提交PR→CI自动跑测试→Review通过后合并。这块我没实现，但理解流程。"

### 知识补充
- GitHub Actions：在GitHub仓库配置.yml文件，push时自动执行
- PR自动生成：AI分析diff→生成commit message→创建分支→push→开PR
- 你的Git Butler MCP设计就是这个方向，只是没实现

---

## 总结：面试整体策略

### 已有能力（当亮点说）
| 能力 | 证据 |
|------|------|
| 编排式多Agent架构 | Trae Solo(规划) + Claude Code(执行) + Code Guardian(检查) |
| Agent vs 工具边界认知 | Code Guardian是工具不是Agent（缺自主决策循环） |
| Workflow Bridge上下文传递 | 文件系统共享状态(current-plan.json) |
| 质量控制系统 | Code Guardian 6项检查 + 配置驱动 |
| 结构化Prompt设计 | Rules(7个) + Skills(6个) 三层约束体系 |

### 缺口（用"设计过但没实现"框架）
| 缺口 | 设计认知 | 面试说辞 |
|------|---------|---------|
| Testing Agent | 签名推导+配置驱动+正反例 | "有架构设计，是当前缺口" |
| 自动修复闭环 | 检查→报告→修复→再检查 | "Code Guardian只报告是设计决策，下一步加修复Agent" |
| PR自动生成 | Git Butler MCP设计 | "设计过Git Butler，没实现" |
| CI/CD | Husky是雏形 | "理解流程，没接入GitHub Actions" |
| 群组式Agent | 投票经历→仲裁策略 | "试过投票，分歧需要Orchestrator仲裁" |

### 一句话总结
> "我的多Agent系统是编排式2.5版本（规划+编码+检查工具），JD要求的是4-Agent完整流水线（+Testing Agent+自动修复+CI/CD）。差距在实现深度不在架构认知——每个缺口我都有设计思路，只是没实现。"

---

## 不需要写代码

本计划是面试准备+知识补充，不涉及代码修改。
