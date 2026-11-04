# SVG 模块

## 概览

SVG 模块让扩展具备「在编辑器里直接看到并压缩 SVG」的能力，分成四条能力线：

1. **悬停预览**：鼠标悬停在源码里的 SVG 上时弹出缩略图与体积
2. **行号槽图标**：在定义 SVG 的那一行显示一个小图标
3. **框架识别**：在 JSX / Vue / Astro / Blade 等文件里定位并提取内联 SVG
4. **SVGO 优化**：独立 `.svg` 文件与内联片段都能就地压缩

> SVG 文件本身的图像预览由 VS Code 内置的 **Image Preview** 承担，
> 扩展不再自建预览视图，只保留「看不见文件内容时」的补充能力（悬停、行号槽）与优化操作。

## 目录结构

```
src/svg/
  index.ts            模块入口：注册悬停、行号槽与 SVG 编辑器操作
  hover.ts            SvgHoverProvider（悬停预览）
  gutter.ts           SvgGutterPreview（行号槽图标）
  extract.ts          在源码文本里定位并提取 SVG / symbol / use 片段
  transform.ts        JSX、Blade、模板表达式的编解码与属性风格转换
  optimize.ts         SVGO 调用、配置转换与回写
  svgoPlugins.ts      纯函数：按配置拼装 SVGO 插件列表
  options.ts          从 SettingsStore 读取 SVG 设置，构造预览选项
  types.ts / consts.ts 公共类型与常量
```

模块入口是 `registerSvgModule(context, store)`，在 `src/extension.ts` 的 `activate` 里调用一次，
返回 `{ refresh }`，用于在管理面板保存设置后重新读取配置。

## 功能详解

### 1. 悬停预览

- 在 15 种语言里注册 `HoverProvider`，鼠标停在 SVG 片段上时弹出 `MarkdownString`
- 内容是 data URI 形式的 SVG 图片，加上体积（`大小: 1.2 KB`）
- 悬停里还会显示原始尺寸（`尺寸: 24 × 24`）：
  优先取根节点的 width/height，缺失时回退到 viewBox；百分比等非绝对尺寸按未知处理，不显示
- 完整 `<svg>` 片段会额外给出一个 **Optimize SVG** 命令链接，`<symbol>` 与 `<use>` 不提供
- 渲染结果按「文档 uri + 片段类型 + 位置 + 长度」缓存 5 秒，避免重复计算
- `svg.enableHover` 关闭后完全不注册悬停行为

### 2. 行号槽图标

- 在 `gutterIconPath` 上放置缩略图，缩略图尺寸按 16px 生成
- 每个 SVG 只显示一个图标：装饰区间取零长度的起始位置
- 触发时机：切换活动编辑器、文档改动后 500ms 防抖、切换主题
- `svg.showGutterPreview` 关闭后不再生成装饰

### 3. 框架识别

支持的语言（`src/svg/consts.ts`）：

| 类别 | 语言 id |
| --- | --- |
| 静态 | `svg`、`xml`、`html` |
| React | `jsx`、`tsx`、`js`、`ts`、`javascriptreact`、`typescriptreact` |
| 其他框架 | `vue`、`astro`、`svelte`、`php`、`blade`、`liquid`、`django-html`、`ejs`、`erb` |

识别与转换的关键点：

- **JSX 属性名**：`strokeWidth` ↔ `stroke-width` 等约 40 个属性用双向映射表互转；
  React 系语言开启 `useCamelCase`，其余语言保持 kebab-case
- **动态内容占位**：JSX 插值、Blade 指令、模板表达式在优化前先被 base64 编码成占位符，
  优化后再还原，避免表达式被 SVGO 误删或被当成无效 XML
- **sprite 解析**：`<use href="#id">` 会去同文档里找对应的 `<symbol id>`，
  找到就把 symbol 注入 `<defs>`，预览能正确渲染
- **预览安全**：提取出的片段如果仍含有未解析的 `{` / `}`，判定为不可预览直接跳过

### 4. SVGO 优化

两条触发路径：

| 路径 | 入口 | 作用范围 |
| --- | --- | --- |
| 独立文件 | 编辑器标题栏右上角的闪电图标（仅在打开 `.svg` 时出现） | 整个 `.svg` 文件 |
| 内联片段 | 悬停预览里的「Optimize SVG」链接 | 选中范围内的 SVG 片段 |

> 独立文件的优化入口只有编辑器标题栏这一个：命令面板与资源管理器右键菜单都不再暴露该命令，
> 避免同一个动作在多个地方重复出现。

优化完成后用 `WorkspaceEdit` 回写，并提示体积变化（`Reduced from 1.2 KB to 620 bytes (49% saved)`）。

内联片段的额外保护：

- 强制 `removeClasses: false`，保留 `v-if`、`on:click`、`className` 等框架专有属性
- 优化后还原作者原本的引号风格，避免破坏外层字符串字面量
- JSX 片段会先转成合法 SVG 再优化，最后转回 JSX 写法

## 配置项

全部配置在 Manager 面板的 **SVG** 分区，存储于 `context.globalState`，参与 Settings Sync。

面板里分两组：**预览选项** 与 **SVGO 优化选项**，后者全部只在点击 ⚡ 优化时才生效。

| Key | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `svg.enableHover` | boolean | `true` | 启用悬停预览 |
| `svg.showGutterPreview` | boolean | `true` | 显示行号槽图标 |
| `svg.removeClasses` | boolean | `true` | 优化独立 SVG 时移除 class（内联 SVG 始终保留） |
| `svg.removeComments` | boolean | `true` | 优化时移除注释 |
| `svg.removeDoctype` | boolean | `true` | 优化时移除 DOCTYPE |
| `svg.cleanupIds` | boolean | `false` | 压缩并清理未使用的 id |
| `svg.floatPrecision` | text | `3` | 浮点数保留的小数位数，0–10 |
| `svg.multipass` | boolean | `true` | 多轮优化直到体积不再下降 |
| `svg.removeViewBox` | boolean | `false` | 删除 viewBox（破坏响应式缩放，默认关闭） |
| `svg.removeDimensions` | boolean | `false` | 删除根节点 width/height（破坏性，默认关闭） |
| `svg.prefixIds` | boolean | `false` | 给所有 id 加前缀，避免内联多个图标时冲突 |
| `svg.mergePaths` | boolean | `true` | 合并相邻路径 |
| `svg.convertShapeToPath` | boolean | `true` | 把 rect/circle/ellipse 转成 path |
| `svg.collapseGroups` | boolean | `true` | 打平 `<g>` 分组 |

### 优化选项的破坏性

前三个破坏性开关默认关闭，需要时才手动打开：

- `removeViewBox`：删掉 viewBox，SVG 将无法再按比例缩放
- `removeDimensions`：删掉根节点宽高，SVG 会撑满容器
- `prefixIds`：给所有 id 加 `prefix__` 前缀，会同时改写引用该 id 的地方

后三个默认保持 SVGO 的 `preset-default` 行为，关掉它们可以保留原始结构
（适合有外部 CSS 依赖特定元素选择器的场景）。

## 命令

| 命令 | 标题 | 出现位置 |
| --- | --- | --- |
| `my-vscode-extension.svg.optimize` | Optimize SVG | 仅编辑器标题栏（仅 `.svg`）；命令面板与右键菜单已隐藏 |
| `my-vscode-extension.svg.optimizeFromHover` | Optimize SVG from Hover | 仅由悬停预览里的链接触发，不进命令面板 |

## 诊断日志

模块的关键动作都会写进输出面板（`My Extension` 通道），包括：

- 激活时的设置快照与「清单中的 SVG 命令」自检（确认宿主加载的是最新清单）
- 悬停命中的片段类型与体积
- 行号槽扫描命中的 SVG 数量
- 优化的前后体积与节省比例
- 所有失败路径的异常堆栈

执行命令 **我的扩展: 查看扩展日志** 即可打开。

## 关于「优化是否无损」

SVGO 的目标是**渲染结果一致**，不是字节级无损。默认配置下会有这些真实差异：

- `floatPrecision` 会四舍五入坐标数值
- `removeUnknownsAndDefaults` 会删除取值等于默认值的属性与未知属性
- `removeClasses` 会把 `<style>` 里的规则内联后删掉 class，**依赖 class 选择器的外部 CSS、hover 效果、CSS 动画会失效**
- `cleanupIds` 会破坏 sprite（`<use>`）、引用与依赖 id 的动画
- `mergePaths` / `convertShapeToPath` 会改变元素结构，对单个元素的 CSS 选择器会失配
- `removeComments` / `removeDoctype` 会丢失注释与版权声明

结论：纯静态图标、无外部 CSS 的场景可以放心用；有 sprite、动画、脚本或外部样式表时，
把 `removeClasses`、`removeComments`、`removeDoctype` 关掉，并保持 `cleanupIds` 关闭。

## 已知限制

- 悬停预览不解析跨文件的 `<use>` 引用，只在同一个文件内解析 `<symbol>`
- 悬停缩略图按包围盒生成，浏览器差异可能导致细微的缩放偏差
- SVGO 4 是纯 ESM 包，扩展的 CommonJS 产物依赖 esbuild 在打包期完成转换
  （类型层面用 `src/types/svgo.d.ts` 做了等价声明）
- SVGO 必须从 `svgo/browser` 引入：node 构建会把 csso / css-tree 留在外部，
  它们在 ESM 源码里用 `createRequire(import.meta.url)`，打成 CommonJS 后 `import.meta.url` 为 undefined，
  会在扩展**加载期**直接抛
  `The argument 'filename' must be a file URL object, file URL string, or absolute path string.`
  导致扩展无法激活；浏览器构建是自包含的，不依赖 Node 文件系统
