# AGENTS.md

VS Code 扩展项目（TypeScript + esbuild + pnpm）。

## 包管理

- 用 **pnpm**（已全局安装，版本写进 `packageManager` 字段）
- 安装：`pnpm install`；脚本：`pnpm run <script>`
- 构建脚本白名单等 pnpm 设置统一写在 `pnpm-workspace.yaml`，不再放 `package.json` 的 `pnpm` 字段（pnpm 12 已不读取）
- 锁文件只有 `pnpm-lock.yaml`，不要生成 `package-lock.json`

## 命令

- `pnpm run typecheck` — 仅类型检查
- `pnpm run package` — 生产构建，产物 `dist/extension.js`（走 `node esbuild.js`，**不要**直接用 esbuild CLI）
- `pnpm run package:dev` — 开发构建（带 sourcemap）
- `pnpm run watch:bundle` — esbuild 监听模式
- `pnpm run vsix` — 打出 `.vsix` 安装包
- `pnpm run compile` — tsc 编译到 `out/`（仅类型产物，不用于打包）

## 打包内容控制

- 用 `package.json` 的 `files` 字段做**白名单**，不使用 `.vscodeignore`
  （vsce 要求二者互斥；同时存在会直接报错）
- `files` 只列运行时必需文件与商店展示文件：`dist/**`、`l10n/bundle.l10n*.json`、
  `package.nls.json`、`package.nls.zh-cn.json`、`README.md`、`LICENSE`
- `package.json` 与 `README.md` 会被 vsce 强制包含；`LICENSE` 必须列进 `files`，否则不会被打进 vsix
- 新增要发布的资源（如 `media/`、`CHANGELOG.md`）时，同步加进 `files`，否则不会出现

## 国际化（两条独立链路）

- **清单层**（displayName/description、命令标题、分类、配置项描述、视图名）：
  在 `package.json` 里写 `%key%` 占位符，译文放扩展根目录的
  `package.nls.json`（英文源）+ `package.nls.<locale>.json`（如 `package.nls.zh-cn.json`）
- **运行时**（代码里弹出的提示、错误等）：
  用 `vscode.l10n.t('English text', { args })`，源文件 `l10n/bundle.l10n.json`，
  译文 `l10n/bundle.l10n.<locale>.json`；目录由 `package.json` 的 `"l10n": "./l10n"` 指定
- 两条链路的源文件都放英文原文作为 key；新增语言时只加 `<locale>` 文件，不改源文件
- 自用扩展不引入 XLF 母版与翻译工具链：直接手改 JSON，需要新语言就复制对应文件改名
- 新增语言文件后**必须**同步加进 `files`，否则不会打进 vsix

## 发布与 CI

- `.github/workflows/ci.yml`：PR / main 分支校验（typecheck → bundle → `vsce ls --tree` 检查打包文件清单）
- `.github/workflows/publish.yml`：推送 `v*` 标签或手动触发，发布到 Visual Studio Marketplace
  - 认证用 **OIDC 受信发布**（`vsce publish --oidc`），不存 PAT；需要 `permissions: id-token: write`
  - 标签触发时会校验 tag 版本与 `package.json` 的 version 一致
  - 手动触发可勾选 `dry-run` 只打包不发布
- 真实发布前需在 Marketplace 后台为 publisher + 仓库 + 工作流文件（`publish.yml`）配置受信发布策略

## 约定

- 打包入口固定为 `dist/extension.js`，manifest 的 `main` 指向它
- 静态文案（命令标题、视图名、配置项描述）放 `package.json` 的 `contributes`，不要硬编码在代码里
- 运行时文案用 `vscode.l10n.t()`，翻译文件放 `l10n/`
- 本机 esbuild CLI 会静默失败（exit 0 但无产物），必须走 Node API 脚本
