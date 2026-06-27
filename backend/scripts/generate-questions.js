#!/usr/bin/env node
// 文件功能: 批量生成面试题目并合并到 questions.json | newQuestions定义 → script合并 → questions.json

const fs = require('fs');
const path = require('path');

const QUESTIONS_PATH = path.resolve(__dirname, '../data/questions.json');

// ============================================================
// 新题目定义（74道）
// ============================================================
const NEW_QUESTIONS = [
  // ============================================================
  // Vue（24题）
  // ============================================================
  {
    title: 'Vue3 中 ref 和 reactive 的核心区别是什么？',
    code: 'const count = ref(0);\nconst state = reactive({ count: 0 });',
    options: [
      'ref 用于基本类型和对象，reactive 只用于对象，ref 需通过 .value 访问',
      'ref 只用于基本类型，reactive 用于对象',
      '两者完全一样',
      'reactive 需要通过 .value 访问'
    ],
    answer: 0,
    analysis: 'ref 可包装基本类型和对象，在 template 中自动解包，script 中需 .value 取值；reactive 只接受对象类型，直接访问属性。ref 底层也是通过 reactive 实现。',
    category: 'Vue',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'computed 和 watch 的使用场景区别是什么？',
    code: 'const fullName = computed(() => firstName.value + lastName.value);\nwatch(source, (newVal, oldVal) => { /* 副作用 */ });',
    options: [
      'computed 用于派生值（无副作用），watch 用于执行副作用',
      'computed 用于异步操作，watch 用于同步计算',
      '两者功能相同',
      'watch 用于计算属性，computed 用于监听变化'
    ],
    answer: 0,
    analysis: 'computed 基于依赖缓存计算结果，不允许副作用，返回值被缓存；watch 用于监听数据变化执行异步/副作用操作，不返回值。选择原则：能用 computed 就不用 watch。',
    category: 'Vue',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'Composition API 中 setup 函数的执行时机是什么？',
    code: 'export default {\n  setup(props, context) {\n    // 何时执行？\n  }\n}',
    options: [
      '在 beforeCreate 之前执行',
      '在 created 之后执行',
      '在 mounted 之后执行',
      '在 beforeMount 之前执行'
    ],
    answer: 0,
    analysis: 'setup 在组件实例创建之前执行，此时组件实例尚未创建，因此无法访问 this。它接收 props 和 context 作为参数，返回的数据和函数可在模板中使用。',
    category: 'Vue',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'Vue3 用 Proxy 替代 Object.defineProperty 解决了什么问题？',
    options: [
      '解决了对象新增属性/数组索引变更无法检测的问题',
      '运行速度更快',
      '包体积更小',
      '支持 TypeScript'
    ],
    answer: 0,
    analysis: 'Object.defineProperty 需要递归遍历对象所有属性，且无法检测新增属性和数组索引变更。Proxy 直接代理整个对象，可拦截新增/删除属性及数组变化，且性能更好、语义更清晰。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: '具名插槽和作用域插槽的区别是什么？',
    code: '<template v-slot:header>标题</template>\n<template v-slot:default="slotProps">{{ slotProps.item }}</template>',
    options: [
      '具名插槽按名称分发，作用域插槽允许子组件向父组件传递数据',
      '两者完全相同',
      '作用域插槽不能具名',
      '具名插槽不能传数据'
    ],
    answer: 0,
    analysis: '具名插槽通过 name 属性区分多个插槽位置；作用域插槽允许子组件将数据通过 slot props 传回父组件使用。二者可组合使用，即具名+作用域插槽。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Vue Router 的导航守卫有哪些类型？',
    options: [
      '全局守卫、路由独享守卫、组件内守卫',
      '只有全局守卫',
      '只有组件内守卫',
      '全局和路由独享但不支持组件内'
    ],
    answer: 0,
    analysis: '导航守卫分为三类：全局守卫（beforeEach/beforeResolve/afterEach）、路由独享守卫（beforeEnter）、组件内守卫（beforeRouteEnter/beforeRouteUpdate/beforeRouteLeave）。执行顺序：全局→路由独享→组件内。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Vue Router 动态路由和路由懒加载如何配合实现？',
    code: 'const routes = [\n  { path: "/user/:id", component: () => import("../views/User.vue") }\n]',
    options: [
      '动态路由用 :param 匹配路径参数，懒加载用动态 import() 按需加载组件',
      '动态路由就是懒加载',
      '懒加载不支持动态路由',
      '动态路由只能配合静态 import 使用'
    ],
    answer: 0,
    analysis: '动态路由通过路径参数 :param 匹配不同路由，懒加载通过 () => import() 实现组件按需加载。二者结合可实现用户访问特定页面时才加载对应组件，减少首屏体积。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Pinia 相比 Vuex 有哪些改进？',
    options: [
      '完整的 TypeScript 支持、无 mutations、更轻量、支持组合式 API',
      '只是换了个名字',
      'Pinia 不支持模块化',
      'Pinia 比 Vuex 更重'
    ],
    answer: 0,
    analysis: 'Pinia 完全拥抱 TypeScript，移除了 mutations（直接修改 state），使用 Composition API 风格定义 store，体积更小（约1KB），且支持多 store 实例和自动模块拆分。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Vue 自定义指令的钩子函数有哪些？',
    code: 'app.directive("focus", {\n  mounted(el) { el.focus(); }\n})',
    options: [
      'created/mounted/updated/unmounted 等',
      '只有 bind 和 unbind',
      '只有 insert 和 update',
      'created/attached/detached'
    ],
    answer: 0,
    analysis: 'Vue3 自定义指令钩子与组件生命周期对齐：created/mounted/updated/unmounted/beforeMount/beforeUpdate/beforeUnmount。Vue2 的 bind/inserted/update 等已废弃。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'mixin 和 Composition API 在逻辑复用上的优劣对比？',
    options: [
      'Composition API 无命名冲突、来源清晰、TS 友好；mixin 有命名冲突和来源不明确问题',
      'mixin 比 Composition API 更好用',
      '两者实现方式完全相同',
      'Composition API 不支持逻辑复用'
    ],
    answer: 0,
    analysis: 'mixin 存在致命缺陷：命名冲突（属性来源不明）、隐式依赖（mixin 之间可相互依赖）、难以 tree-shaking。Composition API 通过组合函数显式引入，来源清晰、无冲突、完全 TS 支持。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: '虚拟 DOM 的 diff 算法的核心策略是什么？',
    options: [
      '同层比较 + 双端指针 + key 优化',
      '深度优先遍历整棵树',
      '广度优先遍历整棵树',
      '随机比较节点'
    ],
    answer: 0,
    analysis: 'Vue 的 diff 策略采用同层比较（跨层移动视为销毁重建），借助双端指针从两端向中间遍历，通过 key 值复用和移动节点，将 O(n^3) 复杂度降为 O(n)。',
    category: 'Vue',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'provide/inject 适合什么场景？有什么注意事项？',
    code: '// 祖先组件\nprovide("theme", ref("dark"));\n// 后代组件\nconst theme = inject("theme");',
    options: [
      '跨多层次传递数据，但不建议用于频繁变化的数据',
      '只能父子组件使用',
      '可以替代 props 所有场景',
      'provide/inject 是响应式的不用加 ref'
    ],
    answer: 0,
    analysis: 'provide/inject 适用于深层级组件传值（如主题、语言设置），避免层层传递 props。默认不是响应式，需传入 ref/reactive 对象。不建议滥用，应优先使用 props 和插槽，避免数据流不清晰。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Composition API 中 onMounted 和 onUnmounted 的执行顺序是怎样的？',
    code: 'setup() {\n  onMounted(() => console.log("child"));\n  onMounted(() => console.log("parent"));\n}',
    options: [
      '子组件先执行，父组件后执行；多个同钩子按注册顺序执行',
      '父组件先执行',
      '按字母顺序执行',
      '同时执行'
    ],
    answer: 0,
    analysis: '生命周期钩子的执行顺序与组件树一致：子组件的 mounted 先于父组件。同一组件内多个同类型钩子按注册顺序依次执行。卸载时顺序相反：父组件的 unmounted 先于子组件。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Vue scoped 样式的工作原理是什么？',
    code: '<style scoped>\n.title { color: red; }\n</style>',
    options: [
      '通过添加 data-v-xxxxx 属性选择器实现样式隔离',
      '使用 Shadow DOM 隔离',
      '通过 CSS Module 实现',
      '只是约定不隔离'
    ],
    answer: 0,
    analysis: 'Vue 编译时为每个组件生成唯一 hash（如 data-v-789abc），在元素上添加该属性，同时将 CSS 选择器改写为 .title[data-v-789abc] 形式，实现样式隔离。注意：scoped 对子组件根元素仍生效。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Teleport 组件的作用是什么？',
    code: '<Teleport to="body">\n  <Modal />\n</Teleport>',
    options: [
      '将子节点渲染到 DOM 中指定位置，解决父容器 overflow/层级问题',
      '实现动画过渡效果',
      '实现组件懒加载',
      '实现组件缓存'
    ],
    answer: 0,
    analysis: 'Teleport 将组件内容渲染到指定的 DOM 节点（如 body）下，常用于模态框、弹出层、全局通知等，避免父组件 overflow:hidden 或 z-index 层叠上下文导致的显示问题。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'keep-alive 的实现原理是什么？',
    code: '<KeepAlive>\n  <component :is="view" />\n</KeepAlive>',
    options: [
      '缓存组件 vnode 和 DOM 实例，切换时不销毁重建',
      '只缓存路由状态',
      '只缓存数据不缓存 DOM',
      '通过 localStorage 持久化'
    ],
    answer: 0,
    analysis: 'keep-alive 将包裹的组件 vnode 和 DOM 实例缓存到 LRU 缓存对象中。组件切换时从缓存取 vnode 直接渲染，触发 activated/deactivated 钩子而非重新挂载。max 属性控制最大缓存实例数。',
    category: 'Vue',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'v-for 中 key 的作用是什么？不设置 key 会导致什么问题？',
    code: '<li v-for="item in list" :key="item.id">{{ item.name }}</li>',
    options: [
      'key 帮助 diff 算法识别节点复用，不设 key 可能导致列表更新错乱和性能下降',
      'key 只是标识没有实际作用',
      '不设 key 会直接报错',
      'key 只影响样式不影响逻辑'
    ],
    answer: 0,
    analysis: 'key 是给每个 vnode 的唯一标识，diff 算法通过 key 判断节点是移动、复用还是销毁重建。不设 key 时 Vue 采用"就地复用"策略，可能导致状态错乱（如输入框内容混淆），且无法利用移动节点优化性能。',
    category: 'Vue',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'Vue 模板编译的完整流程是什么？',
    options: [
      'template → parse(生成AST) → transform(转化) → generate(生成render函数)',
      'template → 直接生成 render 函数',
      'template → generate → parse → transform',
      'template → 编译为 JSX'
    ],
    answer: 0,
    analysis: '模板编译分为三个阶段：parse 将模板解析为 AST（抽象语法树），transform 对 AST 进行静态标记/优化（如静态提升），generate 将优化后的 AST 生成为 render 函数字符串。这也是 Vue 编译器核心工作流程。',
    category: 'Vue',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'nextTick 的作用和实现原理是什么？',
    code: 'count.value++;\nnextTick(() => {\n  // DOM 更新后执行\n  console.log(document.getElementById("count").textContent);\n});',
    options: [
      'DOM 异步更新后执行回调，基于微任务（Promise.then / MutationObserver）实现',
      '立即同步执行回调',
      '基于 setTimeout 实现',
      '只在服务端有效'
    ],
    answer: 0,
    analysis: 'Vue 的 DOM 更新是异步的（批量同步后统一更新）。nextTick 将回调推迟到下次 DOM 更新循环之后执行，底层优先使用 Promise.then（微任务），降级到 MutationObserver 和 setImmediate，最后是 setTimeout。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Vue3 废弃了 $on/$off/$once，推荐用什么替代事件总线？',
    options: [
      '推荐使用外部库 mitt 或 reliance on props/provide-inject 替代',
      '仍然可以使用 $on',
      '使用 Vuex 替代',
      '不需要替代方案'
    ],
    answer: 0,
    analysis: 'Vue3 移除了实例上的 $on/$off/$once 方法，因为事件总线模式在大型项目中难以维护（事件散落各处、类型不安全）。推荐使用 mitt（200字节的轻量库）、provide/inject、Pinia 或组合式函数替代。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Vue3 的 Fragment 特性解决了什么问题？',
    code: '<template>\n  <div>A</div>\n  <div>B</div>\n</template>',
    options: [
      '支持组件模板有多个根节点，无需额外包裹元素',
      '实现了代码分割',
      '实现虚拟滚动',
      '实现异步渲染'
    ],
    answer: 0,
    analysis: 'Vue2 要求每个组件必须有且仅有一个根节点。Vue3 引入 Fragment，允许组件模板有多个根节点，编译时会自动用 Fragment 包裹，减少不必要的 DOM 层级，让 DOM 结构更干净。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Suspense 组件在 Vue3 中的作用是什么？',
    code: '<Suspense>\n  <AsyncComponent />\n  <template #fallback>加载中...</template>\n</Suspense>',
    options: [
      '处理异步组件加载状态，显示 fallback 内容直到异步依赖就绪',
      '实现组件懒加载',
      '实现错误边界',
      '实现组件缓存'
    ],
    answer: 0,
    analysis: 'Suspense 用于管理组件树中异步依赖（异步组件、async setup）的加载状态。在异步依赖 resolved 之前显示 #fallback 插槽内容，就绪后显示默认插槽内容。注意：Suspense 仍属实验性特性。',
    category: 'Vue',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'reactive 在哪些场景下会丢失响应式？',
    code: 'const state = reactive({ list: [1, 2, 3] });\nconst { list } = state; // ❌ 解构后失去响应式',
    options: [
      '解构赋值、展开运算符、赋值给普通变量会丢失响应式',
      '任何情况下都不会丢失',
      '只有异步操作会丢失',
      '只有数组会丢失'
    ],
    answer: 0,
    analysis: 'reactive 返回的是 Proxy 对象，解构或展开会得到普通值（失去 Proxy 代理）。解决方案：使用 toRefs(state) 转换为 ref 对象后再解构，或直接通过 state.xxx 访问属性。ref 没有此问题。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Vue3 中函数式组件与普通组件有何不同？',
    code: '// 函数式组件\nfunction FunctionalComp(props) {\n  return h("div", props.msg);\n}',
    options: [
      '函数式组件无状态、无生命周期、无 this，渲染开销更小',
      '功能完全相同',
      '函数式组件不支持 props',
      '函数式组件只能用于 Vue2'
    ],
    answer: 0,
    analysis: 'Vue3 中函数式组件使用纯函数定义，没有响应式状态和生命周期钩子，渲染开销更小。在 Vue3 中推荐优先使用普通组件（有 Composition API 控制状态），仅在需要极致性能的纯展示场景使用函数式组件。',
    category: 'Vue',
    difficulty: 'medium',
    type: 'single'
  },

  // ============================================================
  // CSS（15题）
  // ============================================================
  {
    title: 'align-items 和 align-content 在 Flex 布局中的区别？',
    options: [
      'align-items 控制单行交叉轴对齐，align-content 控制多行整体分布（只有多行时生效）',
      '两者完全相同',
      'align-items 控制主轴，align-content 控制交叉轴',
      'align-content 只对单行生效'
    ],
    answer: 0,
    analysis: 'align-items 作用于每行内部的交叉轴对齐方式（flex-start/center/stretch 等）；align-content 作用于多行整体在交叉轴上的分布（space-between/space-around 等），仅当 flex-wrap:wrap 且有多行时生效。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'flex: 1 是哪些属性的简写？各是什么含义？',
    code: 'flex: 1; /* 等价于 flex-grow: 1 flex-shrink: 1 flex-basis: 0% */',
    options: [
      'flex-grow（放大比例）/ flex-shrink（缩小比例）/ flex-basis（初始大小）',
      '只有 flex-grow',
      'flex-direction / flex-wrap / flex-flow',
      'flex-grow / flex-direction / flex-basis'
    ],
    answer: 0,
    analysis: 'flex 是 flex-grow（剩余空间分配比例）、flex-shrink（空间不足时缩小比例）、flex-basis（初始主轴尺寸）的简写。flex:1 等价于 flex-grow:1; flex-shrink:1; flex-basis:0%，表示等分剩余空间。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'CSS Grid 中 grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) 的作用？',
    code: '.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n}',
    options: [
      '自动填充列数，每列最小200px，最大等分剩余空间，实现自适应网格',
      '固定3列布局',
      '只显示一列',
      '每列宽度固定为200px'
    ],
    answer: 0,
    analysis: 'auto-fill 自动计算可容纳的列数，minmax(200px, 1fr) 设置每列最小 200px、最大等分剩余宽度。这是 CSS Grid 最常用的自适应布局写法，无需媒体查询即可适配不同屏幕宽度。',
    category: 'CSS',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'CSS transition 和 animation 的核心区别是什么？',
    options: [
      'transition 需要触发条件（一次），animation 可自动执行/循环/多关键帧',
      '两者完全相同',
      'animation 需要触发条件',
      'transition 支持多帧控制'
    ],
    answer: 0,
    analysis: 'transition 只能定义起始和结束两个状态，需要触发条件（如 hover）；animation 配合 @keyframes 可定义多关键帧，支持自动执行、循环播放、暂停/恢复等控制。animation 更灵活但更复杂。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: '@keyframes 定义的关键帧中 from 和 to 等价于什么？',
    code: '@keyframes slide {\n  from { transform: translateX(0); }\n  to { transform: translateX(100px); }\n}',
    options: [
      'from 等价于 0%，to 等价于 100%',
      'from 等价于 50%，to 等价于 100%',
      'from 等价于 0%，to 等价于 50%',
      'from 和 to 不能混用百分比'
    ],
    answer: 0,
    analysis: '在 @keyframes 中 from 就是 0%（起始状态），to 就是 100%（结束状态）。更复杂的动画可用百分比定义多个中间状态，如 0% {opacity:0} 50% {opacity:0.5} 100% {opacity:1}。',
    category: 'CSS',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'CSS 自定义变量（--var）与 Sass 变量的核心区别？',
    code: ':root { --primary: blue; }\n.element { color: var(--primary); }',
    options: [
      'CSS 变量是动态的可运行时修改/继承，Sass 变量编译后固定',
      '两者完全相同',
      'Sass 变量可动态修改',
      'CSS 变量不支持继承'
    ],
    answer: 0,
    analysis: 'CSS 自定义变量是原生 CSS 特性，可级联继承、通过 JS 动态修改、支持媒体查询条件变化。Sass 变量在编译后固定为具体值。CSS 变量适合主题切换，Sass 变量适合编译时统一管理。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: '什么是 CSS 层叠上下文？哪些属性会创建新的层叠上下文？',
    options: [
      '层叠上下文决定元素的 z-index 比较范围，position+定位、flex/grid子项、opacity<1、transform 等会创建',
      '只有 position:absolute 会创建',
      '所有元素都存在独立的层叠上下文',
      'z-index 在任何情况下都全局比较'
    ],
    answer: 0,
    analysis: '层叠上下文是一个三维概念，内部元素的 z-index 仅在当前上下文中比较。创建条件包括：position:relative/absolute + z-index 非 auto、flex/grid 子项且 z-index 非 auto、opacity < 1、transform/perspective/filter 等。',
    category: 'CSS',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'rem、em、vw、vh 分别相对于什么计算？',
    options: [
      'rem 根字号，em 父字号，vw 视口宽度1%，vh 视口高度1%',
      'rem 父字号，em 根字号',
      'vw 和 vh 相对于父元素',
      'rem 相对于父元素字号'
    ],
    answer: 0,
    analysis: 'rem（root em）相对于 html 根元素的 font-size，适合全局统一缩放；em 相对于当前元素或父元素的 font-size，适合局部尺寸；vw/vh 相对于视口宽高，适合全屏/响应式布局。还有 vmin（较小者）和 vmax（较大者）。',
    category: 'CSS',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'calc() 和 clamp() 函数的区别？',
    code: 'width: calc(100% - 40px);\nfont-size: clamp(1rem, 2.5vw, 2rem);',
    options: [
      'calc 做四则运算，clamp 返回指定范围内的值（下限/首选/上限）',
      '两者功能相同',
      'calc 只能做加法',
      'clamp 只能做减法'
    ],
    answer: 0,
    analysis: 'calc() 支持 +-*/ 混合运算，常用于计算动态尺寸。clamp(MIN, VAL, MAX) 当首选值小于 MIN 返回 MIN，大于 MAX 返回 MAX，中间返回 VAL，是实现流体排版的最佳工具，无需媒体查询。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'CSS filter 属性可以实现哪些视觉效果？',
    options: [
      '模糊（blur）、灰度（grayscale）、色相旋转（hue-rotate）、亮度（brightness）等',
      '只能处理模糊效果',
      '只能改变颜色',
      '只能用于图片不能用于文字'
    ],
    answer: 0,
    analysis: 'filter 提供十余种图形滤镜函数：blur（高斯模糊）、grayscale（灰度）、brightness（亮度）、contrast（对比度）、hue-rotate（色相旋转）、saturate（饱和度）、sepia（褐色）、invert（反色）等，可组合使用。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: '移动端 1px 边框问题的原因和解决方案？',
    options: [
      '原因：高清屏物理像素与 CSS 像素比例导致 1px 变粗；方案：transform:scale(0.5) + 伪元素',
      '无解，无法解决',
      '用 border-width:0.5px',
      '用 outline 替代 border'
    ],
    answer: 0,
    analysis: '在高清屏（devicePixelRatio=2/3）上 CSS 1px 对应物理 2-3px，导致看起来粗。常见方案：用伪元素生成 1px 边框再 transform:scaleY(0.5)（根据 dpr 缩放），或 box-shadow 模拟。直接写 0.5px 兼容性不佳。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'CSS scroll-snap 的作用是什么？',
    code: '.container {\n  scroll-snap-type: x mandatory;\n}\n.child { scroll-snap-align: center; }',
    options: [
      '实现滚动容器的吸附效果，滚动停止时自动对齐到指定位置',
      '实现图片懒加载',
      '实现平滑滚动',
      '实现虚拟滚动'
    ],
    answer: 0,
    analysis: 'scroll-snap 让滚动容器在停止时自动吸附到指定的子元素位置。scroll-snap-type 设置方向和严格程度（mandatory/proximity），scroll-snap-align 设置对齐方式。常用于轮播图和卡片列表。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: '字体图标（如 IconFont/Font Awesome）相比图片图标的优势？',
    options: [
      '矢量无损缩放、CSS 控制颜色大小、减少 HTTP 请求、兼容性好',
      '加载速度更慢',
      '不支持多色',
      '不如图片清晰'
    ],
    answer: 0,
    analysis: '字体图标是矢量格式，任意缩放不失真，可通过 font-size/color/text-shadow 等 CSS 属性灵活控制，多个图标合并在一个字体文件中减少请求数。缺点：单色为主，多色图标建议使用 SVG。',
    category: 'CSS',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'linear-gradient 的方向参数 deg 和 to 关键字的对应关系？',
    code: 'background: linear-gradient(45deg, red, blue);\nbackground: linear-gradient(to right top, red, blue);',
    options: [
      '45deg 等价于 to right top，角度从下到上逆时针计算',
      '45deg 等价于 to left bottom',
      '角度从 0 开始顺时针计算',
      'deg 和 to 不能混用'
    ],
    answer: 0,
    analysis: 'CSS 渐变角度方向从下到上逆时针计算：0deg = to top，90deg = to right，180deg = to bottom，270deg = to left。45deg = to right top（右上角）。to 方向关键字更直观，deg 更适合数学计算。',
    category: 'CSS',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'object-fit 属性的作用和常见取值？',
    code: 'img { width: 200px; height: 200px; object-fit: cover; }',
    options: [
      '控制替换元素（img/video）在容器中的适配方式，cover/contain/fill 等',
      '控制背景图片大小',
      '控制元素内边距',
      '控制文本对齐方式'
    ],
    answer: 0,
    analysis: 'object-fit 作用于替换元素（img/video/object），取值：fill（拉伸填满，可能变形）、contain（等比缩放完全显示）、cover（等比缩放裁剪填充）、none（原始尺寸）、scale-down（选 contain 和 none 中较小的）。',
    category: 'CSS',
    difficulty: 'medium',
    type: 'single'
  },

  // ============================================================
  // HTML（16题）
  // ============================================================
  {
    title: '<!DOCTYPE html> 的作用是什么？不写会进入什么模式？',
    options: [
      '声明文档类型为标准模式，不写会触发怪异模式（Quirks Mode），IE 盒模型不一致',
      '声明编码方式',
      '声明语言类型',
      '是可选的可有可无'
    ],
    answer: 0,
    analysis: 'DOCTYPE 声明位于 HTML 文档第一行，告知浏览器使用标准模式（Standards Mode）渲染。缺失 DOCTYPE 时浏览器会进入怪异模式（Quirks Mode），采用 IE5 盒模型（width 包含 padding），导致布局错乱。',
    category: 'HTML',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'meta viewport 标签的作用和最佳实践？',
    code: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    options: [
      '设置视口宽度为设备宽度，禁止缩放，确保移动端页面正确渲染',
      '设置页面标题',
      '设置搜索引擎关键字',
      '设置页面编码'
    ],
    answer: 0,
    analysis: 'meta viewport 是移动端适配的关键标签。width=device-width 让布局视口等于设备宽度，initial-scale=1.0 设置初始缩放比，user-scalable=no 可禁止用户缩放。缺少此标签会导致移动端页面显示桌面缩略视图。',
    category: 'HTML',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'localStorage 和 sessionStorage 的核心区别？',
    options: [
      'localStorage 持久存储（手动删除），sessionStorage 会话级（关闭标签页自动清除）',
      'localStorage 容量更小',
      'localStorage 只能存字符串，sessionStorage 可存对象',
      '两者没有区别'
    ],
    answer: 0,
    analysis: '共同点：都遵循同源策略，容量约 5-10MB，仅存储字符串。区别：localStorage 数据持久存在，除非手动删除；sessionStorage 在页面会话结束时（关闭标签页/窗口）自动清除。不同标签页的 sessionStorage 独立。',
    category: 'HTML',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'Canvas 的核心原理是什么？',
    code: '<canvas id="c" width="300" height="200"></canvas>\n<script>const ctx = c.getContext("2d");\nctx.fillRect(10, 10, 100, 100);</script>',
    options: [
      '基于像素的位图渲染，通过 JS 绘制图形，刷新时整体重绘',
      '基于矢量的渲染',
      '基于 DOM 元素的渲染',
      '基于 CSS 的渲染'
    ],
    answer: 0,
    analysis: 'Canvas 提供 2D 绘图上下文，通过 JS 指令（fillRect/arc/drawImage 等）直接操作像素渲染。优点是性能好适合游戏/图表，缺点是绘制内容是位图（缩放失真），且事件处理需自行实现（无 DOM 事件）。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'HTML5 video/audio 元素相比 Flash 的优势？',
    code: '<video controls src="movie.mp4">\n  <source src="movie.webm" type="video/webm">\n</video>',
    options: [
      '原生支持、无需插件、硬件加速、语义化、可 JS 控制',
      '功能比 Flash 弱',
      '兼容性不如 Flash',
      '不能自定义控制条'
    ],
    answer: 0,
    analysis: 'HTML5 媒体元素原生集成在浏览器中，无需 Flash 插件。支持浏览器原生控件、JS API 控制（play/pause/currentTime）、自定义 UI、硬件加速解码。多 source 元素可实现格式降级兼容。',
    category: 'HTML',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'ARIA 属性的作用和核心原则？',
    code: '<button aria-label="关闭" aria-expanded="false">✕</button>\n<div role="navigation" aria-label="主导航">...</div>',
    options: [
      '为残障用户提供辅助语义，补充原生 HTML 语义不足，原则：不改变视觉效果',
      '用于优化 SEO',
      '用于加速页面加载',
      '用于加密数据传输'
    ],
    answer: 0,
    analysis: 'ARIA（Accessible Rich Internet Applications）通过 role/aria-* 属性增强元素语义，帮助屏幕阅读器识别自定义组件。核心原则：不要改变元素的默认语义和行为，优先使用原生 HTML 元素。ARIA 使用四规则：可点击需加 role="button" + tabindex + 键盘事件。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'iframe sandbox 属性的安全作用？',
    code: '<iframe src="https://example.com" sandbox="allow-scripts allow-same-origin"></iframe>',
    options: [
      '限制 iframe 的能力（禁止表单提交/弹窗/插件等），需要权限逐一开启',
      '设置 iframe 尺寸',
      '允许 iframe 跨域通信',
      '优化 iframe 加载速度'
    ],
    answer: 0,
    analysis: 'sandbox 属性为 iframe 建立安全沙箱，默认启用全部限制（无权限）。通过 allow-scripts（允许脚本）、allow-same-origin（同源访问）、allow-forms（允许提交表单）、allow-popups（允许弹窗）等逐项放行。空值 sandbox="" 最严格。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'async 和 defer 属性在 script 标签中的区别？',
    code: '<script async src="a.js"></script>\n<script defer src="b.js"></script>',
    options: [
      'async 下载完立即执行（不保证顺序），defer 等待 DOM 解析完按顺序执行',
      '两者完全相同',
      'async 按顺序执行，defer 不保证顺序',
      'async 只在 IE 中生效'
    ],
    answer: 0,
    analysis: 'defer：脚本并行下载，等待 HTML 解析完成后按文档顺序执行，触发 DOMContentLoaded 之前。async：脚本下载完立即暂停 HTML 解析并执行，不保证执行顺序。defer 更适合有依赖的脚本，async 适合独立第三方脚本。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: '图片懒加载的实现方式有哪些？',
    code: '<img loading="lazy" src="image.jpg" alt="" />',
    options: [
      '原生 loading="lazy"、IntersectionObserver、监听 scroll 事件',
      '只能用 scroll 事件监听',
      'JS 无法实现懒加载',
      '只能用第三方库'
    ],
    answer: 0,
    analysis: '现代浏览器支持原生 loading="lazy" 属性，最简单可靠。IntersectionObserver 是性能最佳的 JS 方案（异步观察元素可见性）。传统 scroll 事件监听方案性能较差（触发频繁，需节流）。推荐优先使用原生 loading="lazy"。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Web Worker 的作用和使用限制？',
    code: 'const worker = new Worker("worker.js");\nworker.postMessage({ data: "hello" });\nworker.onmessage = (e) => console.log(e.data);',
    options: [
      '在后台线程执行 JS，不能操作 DOM，通过 postMessage 通信',
      '可以操作 DOM',
      '只能做数学计算',
      '只能在 service worker 中使用'
    ],
    answer: 0,
    analysis: 'Web Worker 创建独立线程执行脚本，不阻塞主线程。限制：不能访问 DOM、window/document/parent 对象，不能使用 alert/confirm。通信方式为 postMessage 消息传递（结构化克隆算法）。适用于图像处理/大数据计算。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'SVG 和 Canvas 如何选择？',
    options: [
      'SVG 适合矢量图形/小数量元素（DOM 操作灵活），Canvas 适合大量元素/实时渲染（性能好）',
      'SVG 性能始终比 Canvas 好',
      'Canvas 支持事件处理',
      'SVG 不能做动画'
    ],
    answer: 0,
    analysis: 'SVG 是基于 XML 的矢量格式，每个元素都是 DOM 节点，适合交互（事件绑定方便）、小规模图标/图表。Canvas 是位图模式，适合大量元素（上千个）、实时帧动画（游戏/视频处理）。选型核心：元素数量 + 交互复杂度。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'HTML5 拖拽（Drag & Drop）的核心 API 有哪些？',
    options: [
      'dragstart/dragover/drop/dragend 事件 + DataTransfer 对象',
      '只有 drop 事件',
      '只能用鼠标事件模拟',
      '不支持移动端'
    ],
    answer: 0,
    analysis: 'HTML5 原生拖拽 API：被拖元素监听 dragstart（设置 dataTransfer）、dragend；目标区域监听 dragover（阻止默认以允许放置）、drop（获取数据）。DataTransfer 对象负责传递数据（setData/getData）。桌面端支持良好。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'contenteditable 属性的用途和注意事项？',
    code: '<div contenteditable="true">可编辑内容</div>',
    options: [
      '使元素可编辑，常用于富文本编辑器，需注意输入安全和光标位置',
      '只对 input 元素有效',
      '只能输入纯文本',
      '只读属性不可交互'
    ],
    answer: 0,
    analysis: 'contenteditable 让元素内容可编辑，是富文本编辑器的基础（如 execCommand API）。注意事项：不同浏览器输出的 HTML 不一致；需防范 XSS 攻击（过滤用户输入）；光标位置管理复杂，通常借助 document.execCommand 或第三方库（如 Quill/TinyMCE）。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'data-* 自定义属性的作用和最佳实践？',
    code: '<div data-user-id="123" data-role="admin">用户</div>\n<script>el.dataset.userId // "123"</script>',
    options: [
      '在 HTML 元素上存储自定义数据，通过 dataset API 访问，HTML5 标准特性',
      '只能用于 CSS 选择器',
      '不能通过 JS 访问',
      '会影响页面渲染'
    ],
    answer: 0,
    analysis: 'data-* 属性在 HTML 元素上存储额外数据，不破坏 HTML 验证。JS 端通过 element.dataset.camelCase 访问（如 data-user-id 对应 dataset.userId）。最佳实践：不存储敏感数据、不用于大量数据存储、作为 JS 增强的补充手段。',
    category: 'HTML',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'base64/Data URI 相比外部图片文件的优缺点？',
    code: '<img src="data:image/png;base64,iVBORw0KGgo..." alt="" />',
    options: [
      '优点：减少 HTTP 请求；缺点：体积增大约 33%、不缓存、增加 HTML 大小',
      '体积更小',
      '可以缓存',
      '支持 gzip 压缩'
    ],
    answer: 0,
    analysis: 'Data URI 将图片数据嵌入 HTML/CSS，减少 HTTP 请求。缺点：base64 编码体积比原文件大 33%；不能被浏览器单独缓存；HTML 文件膨胀影响首屏加载。适用于小图标（<10KB），大图片不建议使用。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'History API（pushState/replaceState）的作用？',
    code: 'history.pushState({ page: 1 }, "", "/page/1");\nwindow.addEventListener("popstate", (e) => {\n  // 浏览器前进/后退时触发\n});',
    options: [
      '无刷新修改浏览器 URL 和历史记录，用于 SPA 前端路由',
      '跳转到新页面',
      '刷新当前页面',
      '修改网站标题'
    ],
    answer: 0,
    analysis: 'History API 允许在页面不刷新的情况下操作浏览器的历史栈，pushState 添加新记录，replaceState 替换当前记录。popstate 事件监听浏览器前进/后退。这是 SPA 框架（Vue Router/React Router）history 模式的基础。',
    category: 'HTML',
    difficulty: 'medium',
    type: 'single'
  },

  // ============================================================
  // JavaScript（5题）
  // ============================================================
  {
    title: 'Symbol 的主要用途是什么？',
    code: 'const sym = Symbol("key");\nconst obj = { [sym]: "private value" };\nObject.keys(obj); // []',
    options: [
      '创建唯一且不可变的值，用于对象私有属性名和内置常量标记',
      '替代字符串类型',
      '替代数字类型',
      '用于类型转换'
    ],
    answer: 0,
    analysis: 'Symbol 是 ES6 引入的第7种原始类型，每次调用 Symbol() 都创建唯一值。主要用途：对象唯一属性键（防止属性名冲突）、定义内置行为（Symbol.iterator/Symbol.toStringTag）、模拟私有属性（Object.keys 和 for...in 不可枚举）。',
    category: 'JavaScript',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'WeakMap 和 Map 的核心区别是什么？',
    code: 'let obj = { data: 1 };\nconst wm = new WeakMap();\nwm.set(obj, "metadata");\nobj = null; // 键对象可被 GC 回收',
    options: [
      'WeakMap 键必须是对象且弱引用（不影响 GC），不可遍历',
      'WeakMap 键可以是任意类型',
      'WeakMap 可以遍历',
      'WeakMap 键是强引用'
    ],
    answer: 0,
    analysis: 'WeakMap 键必须是对象（不能是基本类型），持有的是弱引用——当键对象被回收时条目自动删除。不可遍历（没有 keys/values/entries/forEach 方法）。适用于存储对象关联的元数据、缓存和防止内存泄漏的场景。',
    category: 'JavaScript',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Generator 函数的核心特性和应用场景？',
    code: 'function* gen() {\n  yield 1;\n  yield 2;\n  return 3;\n}\nconst g = gen();\ng.next(); // { value: 1, done: false }',
    options: [
      '可暂停恢复执行，通过 yield 返回值、next() 恢复，用于异步流程控制/数据流',
      '等同于普通函数',
      '只能用于同步',
      '不支持传参'
    ],
    answer: 0,
    analysis: 'Generator 函数用 function* 定义，执行返回迭代器对象。通过 yield 暂停并返回值，调用 next() 恢复执行（可传参进入函数体）。应用场景：异步流程控制（async/await 的底层实现）、无限序列生成器、状态机、自定义遍历器。',
    category: 'JavaScript',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'JavaScript Decorator 的作用是什么？',
    code: '@log\n@readonly\nclass MyClass {\n  @debounce(300)\n  handleClick() {}\n}',
    options: [
      '一种特殊函数，用于修改类/方法/属性的行为，实现 AOP 编程',
      '一种新的数据类型',
      '用于类型检查',
      '只在 TypeScript 中存在'
    ],
    answer: 0,
    analysis: 'Decorator（装饰器）是一种特殊的声明，可以附加到类、方法、访问器、属性或参数上，在编译时修改其行为。常用于日志、鉴权、缓存、防抖节流等横切关注点。JS 装饰器仍处于 Stage 3 提案阶段，TypeScript 中已支持实验版本。',
    category: 'JavaScript',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'BigInt 解决了什么问题？使用中有什么限制？',
    code: 'const big = 9007199254740991n;\nconst sum = big + 1n;\n// BigInt 不能与 Number 混合运算',
    options: [
      '解决大整数超出 Number.MAX_SAFE_INTEGER 精度丢失问题，不能与 Number 混合运算',
      '替代所有 Number',
      '比 Number 性能更好',
      '支持小数运算'
    ],
    answer: 0,
    analysis: 'JS Number 类型安全整数范围为 -2^53+1 到 2^53-1，超出则精度丢失。BigInt 通过 n 后缀表示任意精度整数。限制：不能与 Number 混合运算（需显式转换）、不支持 Math 方法、不支持一元正号运算符。适用于高精度计算场景。',
    category: 'JavaScript',
    difficulty: 'medium',
    type: 'single'
  },

  // ============================================================
  // Network（3题）
  // ============================================================
  {
    title: 'HTTP/2 多路复用解决了什么问题？',
    options: [
      '解决 HTTP/1.1 队头阻塞问题，允许同一连接并行传输多个请求/响应',
      '比 HTTP/1.1 请求速度更快但更耗资源',
      '只支持 HTTPS',
      '和 HTTP/1.1 没有区别'
    ],
    answer: 0,
    analysis: 'HTTP/1.1 的队头阻塞：一个连接同一时间只能处理一个请求，后面请求需等待前面完成。HTTP/2 多路复用在一个 TCP 连接上同时传输多个流（stream），帧（frame）交错传输，彻底消除了队头阻塞。注意：TCP 层面的队头阻塞仍需 HTTP/3 解决。',
    category: 'Network',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'WebSocket 和 HTTP 的核心区别？',
    code: 'const ws = new WebSocket("wss://example.com/chat");\nws.onmessage = (e) => console.log(e.data);\nws.send("Hello");',
    options: [
      'WebSocket 是全双工持久连接，服务端可主动推送，适合实时通信',
      'WebSocket 是单向通信',
      'WebSocket 只能用文本协议',
      'WebSocket 和 HTTP 没有区别'
    ],
    answer: 0,
    analysis: 'WebSocket 通过 HTTP 升级握手（Upgrade: websocket）建立持久连接，之后全双工通信（双方随时发送数据）。相比 HTTP 轮询：减少握手开销、降低延迟、服务端可主动推送。适用于聊天/游戏/行情等实时场景。',
    category: 'Network',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'CDN 加速的核心原理是什么？',
    options: [
      '将内容缓存到离用户最近的边缘节点，减少网络延迟和源站压力',
      '压缩文件以加快传输',
      '合并多个请求以减少请求数',
      '替换 HTTP 为 HTTPS'
    ],
    answer: 0,
    analysis: 'CDN（内容分发网络）在全球部署大量边缘节点，用户请求自动路由到最近的节点，大幅减少网络传输距离。核心策略：DNS 解析返回最优节点 IP、内容预热和缓存、回源拉取。不仅加速静态资源（图片/JS/CSS），也支持动态加速（DCDN）。',
    category: 'Network',
    difficulty: 'easy',
    type: 'single'
  },

  // ============================================================
  // Engineering（4题）
  // ============================================================
  {
    title: 'ESLint 在工程中的作用是什么？',
    options: [
      '静态代码检查，发现语法错误、风格问题和反模式，确保代码质量和一致性',
      '打包和压缩代码',
      '测试代码功能',
      '自动部署代码'
    ],
    answer: 0,
    analysis: 'ESLint 通过可配置规则集对代码进行静态分析，在运行前发现潜在错误（未定义变量/死循环/类型错误），统一代码风格（缩进/引号/分号），配合 husky + lint-staged 在提交前自动检查，是保证团队代码质量的第一道防线。',
    category: 'Engineering',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: 'Monorepo 架构的核心优势和挑战？',
    options: [
      '优势：代码共享/统一构建/原子提交；挑战：版本管理/构建效率/权限控制',
      '优势只有代码共享',
      'Monorepo 比 Multirepo 更简单',
      'Monorepo 不支持独立部署'
    ],
    answer: 0,
    analysis: 'Monorepo（单一仓库）将所有相关项目放在一个仓库管理。优势：跨项目代码共享方便、原子提交（一次修改影响所有包）、统一 CI/CD 配置。挑战：仓库体积大影响 git 操作、构建工具选型复杂（需增量构建）、权限控制粒度粗。常用工具：Nx/Turborepo/pnpm workspace。',
    category: 'Engineering',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Webpack Module Federation 的核心概念？',
    options: [
      '允许多个独立构建的应用在运行时共享模块，实现微前端',
      '打包所有模块到一个文件',
      '按需加载模块',
      '代码压缩工具'
    ],
    answer: 0,
    analysis: 'Module Federation 是 Webpack 5 的核心功能，允许构建时远程模块在运行时动态加载。每个应用既是 Host（消费者）也是 Remote（提供者），实现应用间组件/状态/库的共享。这是当前微前端架构的重要技术方案之一。',
    category: 'Engineering',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'CI/CD 的核心流程包括哪些阶段？',
    options: [
      '代码提交 → 自动构建 → 自动测试 → 自动部署（分环境）',
      '只有自动测试',
      '只有自动部署',
      '手动构建 → 自动测试'
    ],
    answer: 0,
    analysis: 'CI（持续集成）：代码推送后自动触发构建和测试，确保每次变更质量。CD（持续交付/部署）：通过 CI 的代码自动部署到测试环境（持续交付）或直接上线（持续部署）。标准流程：lint → build → unit test → integration test → deploy staging → e2e test → deploy production。',
    category: 'Engineering',
    difficulty: 'medium',
    type: 'single'
  },

  // ============================================================
  // Browser（7题）
  // ============================================================
  {
    title: '浏览器渲染流水线的完整流程是什么？',
    options: [
      'DOM树 → CSSOM树 → Render树 → Layout(布局) → Paint(绘制) → Composite(合成)',
      'HTML解析 → 直接渲染',
      'CSSOM → DOM → 渲染',
      'Layout → Paint → DOM → CSSOM'
    ],
    answer: 0,
    analysis: '渲染流水线：1. HTML 解析构建 DOM 树，CSS 解析构建 CSSOM 树；2. DOM + CSSOM 合并为 Render 树（剔除 display:none）；3. Layout 计算布局位置；4. Paint 绘制像素；5. Composite 分层合成最终呈现。transform/opacity 等属性可跳过 Layout 和 Paint，直接进入 Composite，性能最优。',
    category: 'Browser',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: '浏览器中如何检测和定位内存泄漏？',
    options: [
      '使用 Chrome DevTools Performance/Memory 面板，分析堆快照和节点数量变化',
      '只能靠经验猜测',
      'JS 无法检测内存泄漏',
      '通过 console.log 查看'
    ],
    answer: 0,
    analysis: '常用检测手段：Chrome Memory 面板拍摄堆快照（Heap Snapshot），对比前后节点数变化定位泄漏；Performance 面板录制查看内存曲线是否持续上升（锯齿形正常，阶梯形表示泄漏）；Timeline 录制后手动触发 GC 观察内存是否回收。常见泄漏原因：未清除的定时器/事件监听/闭包/全局变量。',
    category: 'Browser',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'XSS 和 CSRF 攻击的核心区别是什么？',
    options: [
      'XSS 是注入恶意脚本窃取数据，CSRF 是伪造用户请求执行操作',
      '两者完全一样',
      'XSS 是服务端攻击，CSRF 是客户端攻击',
      'CSRF 无法防御'
    ],
    answer: 0,
    analysis: 'XSS（跨站脚本攻击）攻击者将恶意脚本注入页面，窃取 Cookie/Token/用户数据。防御：输入过滤、输出转义、CSP、HttpOnly Cookie。CSRF（跨站请求伪造）攻击者诱导用户在已登录状态下点击链接，伪造请求执行操作。防御：SameSite Cookie、CSRF Token、验证 Referer。',
    category: 'Browser',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Cookie 和 Session 的区别是什么？',
    options: [
      'Cookie 存储在客户端，Session 存储在服务端，Session 依赖 Cookie 传递 sessionId',
      '两者都存储在客户端',
      '两者都存储在服务端',
      'Cookie 安全级别更高'
    ],
    answer: 0,
    analysis: 'Cookie 是浏览器存储的小型文本数据（每个请求自动携带），Session 是服务端存储的用户会话数据。Session 通常通过 Cookie 传递 sessionId 来关联，但也可通过 URL 参数传输。Cookie 有大小限制（4KB）和数量限制，Session 安全但占用服务端资源。',
    category: 'Browser',
    difficulty: 'easy',
    type: 'single'
  },
  {
    title: '跨域问题（CORS）有哪些解决方案？',
    options: [
      '服务端设置 Access-Control-Allow-Origin、反向代理、JSONP（仅 GET）、postMessage',
      '没有解决方案',
      '只能在服务端修改',
      'JSONP 支持所有请求方式'
    ],
    answer: 0,
    analysis: 'CORS（跨域资源共享）由浏览器同源策略引发。解决方案：1. 服务端设置响应头 Access-Control-Allow-Origin（推荐）；2. 开发环境配置代理服务器（vite/webpack proxy）；3. Nginx 反向代理；4. JSONP（仅支持 GET 请求，有安全风险）；5. postMessage 实现跨窗口通信。',
    category: 'Browser',
    difficulty: 'medium',
    type: 'single'
  },
  {
    title: 'Core Web Vitals 包括哪些指标？各自衡量什么？',
    options: [
      'LCP（加载性能）、FID/INP（交互性）、CLS（视觉稳定性）',
      '只有加载速度',
      '只有交互延迟',
      '只有页面大小'
    ],
    answer: 0,
    analysis: 'Core Web Vitals 是 Google 的 Web 用户体验核心指标：LCP（Largest Contentful Paint）衡量最大内容元素加载时间，目标 <2.5s；FID（First Input Delay）衡量首次交互延迟，目标 <100ms（已被 INP 逐步取代）；CLS（Cumulative Layout Shift）衡量页面布局偏移，目标 <0.1。这些指标直接影响搜索引擎排名。',
    category: 'Browser',
    difficulty: 'hard',
    type: 'single'
  },
  {
    title: 'PWA（Progressive Web App）的核心技术是什么？',
    options: [
      'Service Worker（离线缓存）+ Manifest（安装到桌面）+ HTTPS',
      '只有离线缓存',
      '只有推送通知',
      '只能用在 Android 上'
    ],
    answer: 0,
    analysis: 'PWA 核心技术三要素：Service Worker 实现离线缓存/后台同步/推送通知（需 HTTPS）；Web App Manifest 配置应用名称/图标/主题色，允许添加到主屏幕；App Shell 架构保证首屏快速加载。PWA 可在部分浏览器告示安装提示，体验接近原生应用。',
    category: 'Browser',
    difficulty: 'hard',
    type: 'single'
  }
];

// ============================================================
// 主逻辑
// ============================================================

/**
 * 读取现有题目，计算最大 ID，
 * 为新增题目分配自增 ID，
 * 支持 --preview 预览和直接写入两种模式
 */
function main() {
  const isPreview = process.argv.includes('--preview');

  // 读取现有题目
  let existing = [];
  if (fs.existsSync(QUESTIONS_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf-8'));
    } catch (err) {
      console.error('❌ 读取 questions.json 失败:', err.message);
      process.exit(1);
    }
  }

  // 计算最大 ID（兼容空数组）
  const maxId = existing.reduce((max, q) => Math.max(max, q.id || 0), 0);

  // 自动分配自增 ID
  const questionsWithIds = NEW_QUESTIONS.map((q, i) => ({
    ...q,
    id: maxId + i + 1
  }));

  // ---- 预览模式 ----
  if (isPreview) {
    const categories = {};
    const difficulties = {};

    questionsWithIds.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1;
      difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1;
    });

    const hasCode = questionsWithIds.filter(q => q.code).length;

    console.log('=== 预览: 待生成题目统计 ===');
    console.log('');
    console.log(`现有题目数:   ${existing.length}`);
    console.log(`新增题目数:   ${questionsWithIds.length}`);
    console.log(`合并后总数:   ${existing.length + questionsWithIds.length}`);
    console.log(`ID 范围:      ${maxId + 1} ~ ${maxId + questionsWithIds.length}`);
    console.log(`含代码题:     ${hasCode} 题`);
    console.log('');
    console.log('--- 按分类统计 ---');
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => console.log(`  ${cat.padEnd(12)} ${count} 题`));
    console.log('');
    console.log('--- 按难度统计 ---');
    Object.entries(difficulties).forEach(([d, c]) => {
      const label = { easy: '简单', medium: '中等', hard: '困难' }[d] || d;
      console.log(`  ${label.padEnd(6)} ${c} 题`);
    });
    return;
  }

  // ---- 写入模式 ----
  const merged = [...existing, ...questionsWithIds];
  try {
    fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    console.log(`✅ 成功写入 ${questionsWithIds.length} 道新题目`);
    console.log(`   文件: ${QUESTIONS_PATH}`);
    console.log(`   合并后共 ${merged.length} 道题目`);
  } catch (err) {
    console.error('❌ 写入 questions.json 失败:', err.message);
    process.exit(1);
  }
}

main();