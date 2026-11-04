# My VS Code Extension

![My VS Code Extension](media/icon.png)

个人自用的开发辅助扩展：为项目添加 LICENSE 文件，并提供一个覆盖全部功能的
**管理面板**（配置跨设备同步）。

## 功能

- **状态栏入口**：左下角状态栏显示许可证图标，点击打开管理面板
- **管理面板**：整个扩展的配置中心——按功能分区展示设置，
  后续接入的新功能会各自成块出现在这里
- **配置跨设备同步**：面板里的配置存放在全局状态中，
  并通过 VS Code Settings Sync 在多台设备间同步
- **GitHub 登录提升配额**：用 VS Code 内置的 GitHub 登录会话获取 API 令牌，
  把速率限制从 60 次/小时提升到 5000 次/小时
- **Context7 MCP**：注册远程 Context7 MCP 服务，让 Copilot 等 AI 助手访问最新的库文档；
  支持 API Token 和 OAuth 登录两种认证模式；API Key 通过管理面板配置并存入 VS Code SecretStorage
- **自动推断作者与年份**：留空时从 `git config user.name` 与仓库首次提交年份推断
- **占位符自动替换**：MIT / Apache / GPL / WTFPL 等常见许可证的年份与作者占位符都会被替换
- **多许可证**：可一次生成多个文件，文件名形如 `LICENSE-MIT.md`
- 中英文双语界面，随 VS Code 语言环境自动切换

## 使用

1. 打开项目目录
2. 点击状态栏的许可证图标，或执行命令面板中的 **我的扩展: 打开管理面板**
3. 在「许可证」分区点「加载许可证列表」，选择默认许可证，
   并填写作者、年份等选项后保存
4. 执行 **许可证: 添加许可证** 即可在当前目录生成 LICENSE 文件
5. 在 Context7 分区填写 API Key 后保存；清空 API Key 并保存即可移除密钥。
   修改密钥后，在 **MCP: List Servers** 中重启 Context7 服务以应用新密钥。
   也可以在认证模式中选择 OAuth，让 VS Code 在首次使用 Context7 时处理登录、令牌存储和刷新。

Context7 MCP 提供 `resolve-library-id` 和 `get-library-docs` 工具，可在
Copilot Chat 的 Agent 模式中使用 `use context7` 请求最新的库文档与示例，
也可以直接引用类似 `/supabase/supabase` 的 Context7 Library ID。

| 命令 | 作用 |
| --- | --- |
| `My Extension: Open Manager` | 打开管理面板（全部功能配置） |
| `License: Add License` | 添加一个许可证到项目 |
| `License: Add Multiple Licenses` | 添加多个许可证到项目 |
| `License: Add Default License` | 直接添加默认许可证 |

## 管理面板

面板按功能分区，每个分区包含该功能的配置项与操作按钮：

| 分区 | 内容 |
| --- | --- |
| 许可证 | 默认许可证、作者、年份、文件名、扩展名、惯用文件名开关；加载列表 / 添加 / 批量添加 / 添加默认许可证 |
| GitHub 账号 | 登录状态、登录与退出按钮（令牌由 VS Code 托管，不落盘） |
| Context7 | Context7 MCP 服务、API Token/OAuth 认证和 API Key 校验 |

许可证配置存放在扩展的全局状态里，并随 Settings Sync 同步；Context7 API Key
单独存放在 VS Code SecretStorage 中，不会写入面板配置同步数据：

| 项 | 说明 |
| --- | --- |
| 默认许可证 | 选中的许可证，也是「添加默认许可证」使用的那个 |
| 作者 | 留空则使用 `git config user.name` |
| 年份 | 留空则使用仓库首次提交的年份 |
| 文件名 | 默认 `LICENSE`；GPL / Unlicense 等会使用惯用文件名（COPYING / UNLICENSE） |
| 文件扩展名 | 无、`.md` 或 `.txt` |

## 多语言

- 命令标题、扩展名称等界面元素取自 `package.nls.json` / `package.nls.zh-cn.json`
- 运行时的提示消息取自 `l10n/bundle.l10n.json` / `l10n/bundle.l10n.<locale>.json`

新增一种语言时，直接复制对应文件并改名即可，例如把
`package.nls.zh-cn.json` 复制为 `package.nls.ja.json` 后填写日文译文。
VS Code 会按当前语言环境自动加载。

## 打包发布

```bash
pnpm install
pnpm run package     # 打包到 dist/extension.js
pnpm run vsix        # 生成 .vsix 安装包
```

生成的 `.vsix` 可通过 VS Code 的 "Install from VSIX…" 安装。

## 变更记录

请参阅 [CHANGELOG.md](CHANGELOG.md)。

## 自动发布

仓库内置 GitHub Actions 工作流：

- 推送到 `main` 或提交 PR 时自动跑校验（类型检查、构建、打包文件清单检查）
- 推送 `v*` 标签时自动打包并发布到 Visual Studio Marketplace

发布使用 **OIDC 受信发布**，无需在仓库里保存 PAT：
工作流通过 `id-token: write` 权限向 GitHub 换取 OIDC 令牌，再向 Marketplace 换取短期会话令牌完成发布。
前提是已在 Marketplace 后台为该 publisher、仓库与工作流文件 `publish.yml` 配置好受信发布策略。
