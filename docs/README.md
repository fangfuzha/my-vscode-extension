# 文档索引

本扩展的文档按**功能模块**拆分，一篇文档对应一组源码目录。

| 文档 | 覆盖的源码 | 说明 |
| --- | --- | --- |
| [svg-module.md](./svg-module.md) | `src/svg/` | 悬停预览、行号槽图标、框架识别与 SVGO 优化 |
| [mcp-module.md](./mcp-module.md) | `src/context7/`、`src/deepwiki/` | MCP 能力统一说明：Context7 与 DeepWiki 两个 MCP 服务器的接入、认证与配置 |
| [highlight-module.md](./highlight-module.md) | `src/highlight/` | 选中文字后在编辑器与小地图中高亮所有相同片段 |
| [json5-module.md](./json5-module.md) | `syntaxes/` | JSON5 2.x 语法高亮：grammar、语言配置与自测脚本 |
| [license-module.md](./license-module.md) | `src/license/` | LICENSE 文件生成：API、命令、git 推断、模板替换与写盘 |
| [github-module.md](./github-module.md) | `src/github/` | 在浏览器中打开当前文件在 GitHub 上的链接（含行号定位） |
| [panel-localization.md](./panel-localization.md) | `src/panel/`、`media/panel.*` | 管理面板的双语实现：文案从哪来、为什么不改成面板自译 |

## 模块与配置的对应关系

所有模块共用同一套配置体系：

- 所有配置项声明在 `src/config/schema.ts` 的 `SECTIONS` 里
- 存储在 `context.globalState`（密钥类字段存 `context.secrets`）
- 全部在 **Manager 面板**（`media/panel.html`）里编辑，面板是唯一的配置入口
- 新增字段时必须同步 `media/panel.html` 的 `data-key`，否则 `node scripts/check-panel.mjs` 会失败。
同一个脚本还会校验 `package.json` 里所有 `%key%` 占位符在 `package.nls.json` 与
`package.nls.zh-cn.json` 中都有译文——漏一条会在界面上显示成原始的 `%key%`；
以及代码里 `vscode.l10n.t()` 用到的每个 key 在两个 `l10n/bundle.l10n*.json` 里都有条目——
漏译不会报错，只会在中文环境下回落显示英文。

配置项一览：

| 分区 | 文档 |
| --- | --- |
| License | [license-module.md](./license-module.md) |
| SVG | [svg-module.md](./svg-module.md) |
| Context7 / DeepWiki | [mcp-module.md](./mcp-module.md) |
| Highlight | [highlight-module.md](./highlight-module.md) |
| JSON5 语法高亮 | [json5-module.md](./json5-module.md) |
| GitHub account | [license-module.md](./license-module.md#github-账号与限流)（许可证列表的取数依赖它） |
| GitHub links | [github-module.md](./github-module.md) |

## 诊断日志

扩展的运行期信息统一写进 VS Code 的**输出面板**，通道名是 `My Extension`：

- 命令面板执行 **我的扩展: 查看扩展日志**（`My Extension: Show Extension Log`）可直接打开
- 也可在「输出」面板的通道列表里手动选 `My Extension`

日志覆盖的内容：

| 内容 | 触发时机 |
| --- | --- |
| 扩展已激活 / 注册完成 | 激活阶段 |
| SVG 模块注册与当前设置快照 | 激活阶段 |
| 活动编辑器切换、context key 的 true/false 变化 | 每次切换编辑器 |
| 清单中的 SVG 命令自检 | 激活阶段 |
| 选区高亮的匹配数量 | 每次重算后命中数变化时 |
| 行号槽扫描命中的 SVG 数量 | 文档变更后（防抖 500ms） |
| 悬停命中的片段类型与体积 | 鼠标悬停 SVG |
| 优化的前后体积与节省比例 | 执行优化 |
| 异常与堆栈 | 任何失败路径 |

新增日志请用 `src/logger.ts` 的 `logInfo` / `logWarn` / `logError`，
不要用 `console.log`——后者只在扩展宿主终端可见，用户在输出面板里看不到。

## 本地化

运行时文案走 `vscode.l10n.t()`，源文件 `l10n/bundle.l10n.json`，中文译文 `l10n/bundle.l10n.zh-cn.json`；
清单层文案走 `package.nls.json` 与 `package.nls.zh-cn.json`。两条链路互不混用。

面板的具体实现与取舍见 [panel-localization.md](./panel-localization.md)。
