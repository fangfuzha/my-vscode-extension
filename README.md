# My VS Code Extension

![My VS Code Extension](media/icon.png)

个人自用的开发辅助扩展：生成 LICENSE 文件、在源码里预览与优化 SVG，并接入 Context7 与 DeepWiki 两个 MCP 服务。
全部配置集中在一个**管理面板**里，并随 VS Code Settings Sync 在多台设备间同步。

## 功能

- **许可证**：从 GitHub 许可证目录挑选一个或多个，一键生成 LICENSE 文件；作者与年份可从 git 自动推断
- **源码里的 SVG 预览**：悬停 SVG 片段看缩略图与体积，行号旁还会显示一个小的 SVG 图标
- **SVG 优化**：用 SVGO 压缩独立 `.svg` 文件或源码里的内联片段，并提示体积节省比例
- **选区高亮**：选中一段文字，编辑器里所有相同片段一起高亮，并在小地图旁标出位置
- **GitHub 链接**：在浏览器里打开当前文件在 GitHub 上的位置，带行号定位；链接由本地 git 信息生成
- **JSON5 语法高亮**：按 JSON5 2.x 最新规范高亮 `.json5` 文件（单引号、注释、尾逗号、未加引号的键、各类数字与转义）
- **MCP**：注册 Context7 与 DeepWiki 两个 MCP 服务器，供 AI 助手读取库文档与仓库文档
- **GitHub 登录**：把许可证接口的速率限制从 60 次/小时提升到 5000 次/小时（令牌由 VS Code 托管，不落盘）
- **中英文双语**：随 VS Code 语言环境自动切换

## 快速上手

1. 点击状态栏图标，或执行命令面板中的 **我的扩展: 打开管理面板**
2. 在「许可证」分区点「加载许可证列表」，选择默认许可证；需要时在「SVG」「Context7」「DeepWiki」「GitHub 账号」分区继续配置
3. 保存后按需执行下面的命令

| 命令 | 作用 |
| --- | --- |
| `My Extension: Open Manager` | 打开管理面板（全部功能配置） |
| `License: Add License` | 添加一个许可证到项目 |
| `License: Add Multiple Licenses` | 添加多个许可证到项目 |
| `License: Add Default License` | 直接添加默认许可证 |
| `My Extension: Clear Selection Highlight` | 清除当前的选区高亮 |
| `My Extension: Open in GitHub` | 在浏览器里打开当前文件在 GitHub 上的位置 |

SVG 文件的图像预览用 VS Code 内置的 Image Preview 即可；扩展额外提供源码里的悬停预览与行号槽图标。
打开 `.svg` 文件时，编辑器标题栏右上角会出现唯一的优化按钮（闪电图标），点击即压缩当前文件；
在源码里悬停 SVG 片段可以看到缩略图与体积，点其中的「优化 SVG」链接能只压缩那一段内联 SVG。

> SVGO 的目标是「渲染结果一致」而不是字节级无损：若 SVG 依赖外部 CSS、动画、脚本或 sprite 引用，
> 建议在面板里关掉「移除 class 属性」「移除注释」「移除 DOCTYPE」，并保持「清理未使用的 ID」关闭。

## 文档

各功能的完整说明见 [docs/](docs/README.md)：

- [SVG 模块](docs/svg-module.md) —— 悬停预览、行号槽、框架识别与 SVGO 优化的全部细节
- [MCP 模块](docs/mcp-module.md) —— Context7 与 DeepWiki 的接入、认证与配置
- [License 模块](docs/license-module.md) —— 许可证生成的全流程与配置项
- [选区高亮模块](docs/highlight-module.md) —— 选中即高亮全部相同片段的匹配规则与配置项
- [GitHub 链接模块](docs/github-module.md) —— 链接的生成规则、引用选择与未提交改动提示
- [JSON5 模块](docs/json5-module.md) —— JSON5 语法高亮的规则覆盖范围与自测方式

## 调试

在 VS Code 中打开本仓库并按 `F5`，会启动扩展开发宿主（会先自动打包）。
运行时日志见「输出」面板中选择扩展宿主；配置项改动后可点管理面板的「保存」再观察效果。

## 变更记录

请参阅 [CHANGELOG.md](CHANGELOG.md)。
