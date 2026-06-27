---
alwaysApply: true
---

# 代码注释规范（AI生成必须遵守）

> 版本: v1.0 | 项目: 面试宝典（Interview Handbook）
> 本规则始终生效。AI生成新代码时必须按本规范添加注释。
> 注释行的目的是帮助用户（你）后续重读代码时快速理解，不是给机器看的。

## 一、文件头注释（每个文件顶部必加）

每个 `.vue` / `.js` 文件的顶部，用单行注释描述：

**格式**：`// 文件功能: xxx | 数据流: xxx → xxx → xxx`

不同类型文件的关注点：

| 文件类型 | 必含信息 | 示例 |
|---------|---------|------|
| api/*.js | 接口URL + 请求方式 | `// 题库接口: GET /questions(筛选) GET /questions/:id(详情)` |
| composables/*.js | 暴露的状态和方法 | `// 答题业务: 状态=questions/currentIndex/submitted 方法=handleSelect/handleSubmit` |
| stores/*.js | store状态结构 | `// user store: token/userInfo/login()/logout()/getMe()` |
| views/*.vue | 页面功能 + 使用的composable | `// 题库列表页: 筛选/搜索/分页/开始答题 → useQuestionBank()` |
| controllers/*.js | 路由路径 + 核心逻辑 | `// 题目: getList(筛选+搜索+分页) getDetail(按id)` |
| routes/*.js | 注册的路由列表 | `// /api/questions → getList / getDetail` |

## 二、函数/方法注释（每个函数必加）

### 简洁单行版（函数 ≤15行时用）

```
// 根据分类/难度/关键词筛选题目，更新store.list
function buildParams() { ... }
```

### 完整块注释版（函数 16-30行时用）

```
/**
 * 提交答题记录
 * @param {Object} payload - { answers[], score, timeUsed, questionIds[] }
 * @param {boolean} force - 是否超时强制提交（跳过空答案检查）
 * @returns {Promise<Object>} 提交结果 { recordId, result }
 * @sideEffect 写入 records.json + 更新 stats 状态
 */
```

### 必须注释的内容
- 参数：非自解释的参数要标注类型和含义
- 返回值：标注返回结构
- 副作用：如果函数修改了外部状态（store、文件、localStorage），必须标注
- 异步行为：如果函数有竞态条件风险，标注"注意：并发调用会覆盖XXX"

## 三、复杂逻辑行级注释（条件触发）

以下情况必须添加行内注释：

### 3.1 数据转换（map/filter/reduce 链）

```js
// ✅ 好：标注每一步
stats.dailyTrend
  .filter(d => d.date >= weekAgo)    // 只取最近7天
  .map(d => ({ date: d.date.slice(5), rate: d.rate }))  // 截取MM-DD格式
  .sort((a, b) => a.date.localeCompare(b.date))  // 按日期排序

// ❌ 差：没有注释
stats.dailyTrend.filter(d => d.date >= weekAgo).map(d => ({ date: d.date.slice(5), rate: d.rate })).sort(...)
```

### 3.2 复杂条件分支

```js
// ✅ 好：标注每个分支的含义
if (stats.totalQuestions === 0) {
  // 首次使用，无统计数据
} else if (stats.totalCorrect / stats.totalQuestions < 0.5) {
  // 正确率低于50%，提示加强练习
} else {
  // 正常状态
}
```

### 3.3 ECharts 配置

```js
// ✅ 好：标注每个关键配置的含义
lineChart.setOption({
  xAxis: { data: stats.dailyTrend.map(d => d.date.slice(5)) },  // X轴: 日期(MM-DD)
  yAxis: { max: 100, axisLabel: { formatter: '{value}%' } },    // Y轴: 百分比
  series: [{ type: 'line', data: stats.dailyTrend.map(d => d.rate), smooth: true }]  // 趋势线
})
```

### 3.4 异步流程/竞态

```js
// ✅ 好：标注竞态风险
// 注意：如果用户快速切换筛选条件，前一次请求可能后返回导致数据错乱
// 解决方案：每次新请求前 abort 旧连接
```

### 3.5 正则表达式

```js
// ✅ 好：标注匹配意图
const JSON_PATTERN = /\{[\s\S]*\}/  // 匹配AI返回中的JSON对象
```

## 四、Vue模板注释

```
<!-- ✅ 好：用注释分隔模板区域 -->
<!-- 数据卡片区 -->
<el-row :gutter="16" class="stat-cards"> ... </el-row>

<!-- 图表区 -->
<el-row :gutter="16" class="chart-row"> ... </el-row>

<!-- 薄弱知识点列表 -->
<el-card shadow="hover" class="weak-list-card"> ... </el-card>
```

```
<!-- ✅ 好：非自解释的 v-if 加注释 -->
<!-- 提交后显示结果 -->
<div v-if="submitted && result"> ... </div>

<!-- 答题中显示题目 -->
<div v-else-if="currentQuestion"> ... </div>

<!-- 加载中 -->
<div v-else> ... </div>
```

## 五、反例与正例对照

| ❌ 差（无信息量） | ✅ 好（说明意图） |
|------------------|----------------|
| `// 循环` | `// 遍历薄弱知识点，按错误次数降序排列` |
| `// 处理数据` | `// 从API返回的rawStats中提取每日趋势，格式化为ECharts series数据` |
| `// 判断` | `// 判断用户是否已答完所有题目（未答题=0时禁止提交）` |
| `// 设置` | `// 设置答题计时器初始值=180秒，超时自动提交` |
| `// 请求` | `// 获取学习统计数据: 总答题数/正确率/每日趋势/分类统计/薄弱点TOP5` |

## 六、裁决规则（冲突时听谁的）

1. **注释不占行数配额**：注释行不计入文件行数限制（02-file-size-limits.md）
   - 不能以"文件超行了"为由删注释
2. **注释要精简**：一行注释说清楚，不用写小作文
   - ✅ `// 按错误次数降序排列薄弱知识点`
   - ❌ `// 这里我们遍历所有薄弱知识点，然后根据它们的错误次数进行从高到低的排序处理`
3. **只注释"为什么"和"是什么"，不注释"怎么做"**
   - ✅ `// 用滑动窗口裁剪历史消息，保留最近5轮对话`
   - ❌ `// 用for循环遍历messages数组，取后10条，判断如果超过1000字符就截断`
4. **已有代码不动注释**：修改已有代码时，不动该段代码无关的注释（遵循05-coding-discipline原则3）