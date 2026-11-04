# AGENTS.md

VS Code 扩展项目（TypeScript + esbuild + pnpm）。

## 包管理

- 用 **pnpm**（已全局安装，版本写进 `packageManager` 字段）
- 安装：`pnpm install`；脚本：`pnpm run <script>`
- 锁文件只有 `pnpm-lock.yaml`，不要生成 `package-lock.json`

## 命令

- `pnpm run typecheck` — 仅类型检查
- `pnpm run package` — 生产构建，产物 `dist/extension.js`（走 `node esbuild.js`，**不要**直接用 esbuild CLI）
- `pnpm run package:dev` — 开发构建（带 sourcemap）
- `pnpm run watch:bundle` — esbuild 监听模式
- `pnpm run vsix` — 打出 `.vsix` 安装包
- `pnpm run compile` — tsc 编译到 `out/`（可用来跑纯函数的 Node 自测）
- `node scripts/check-panel.mjs` — 校验面板 HTML 与 schema 是否一致

## 目录结构

```
src/extension.ts            activate：注册命令 + 状态栏项 + 声明同步 key
src/config/
  schema.ts                 所有可配置项的声明式描述（分区 / 字段 / 操作）
  store.ts                  globalState 存储 + setKeysForSync
src/license/
  api.ts                    GitHub Licenses API + GitHub 登录会话取令牌
  commands.ts               选择/多选/默认许可证三个命令
  git.ts                    从 git 推断作者与首次提交年份
  panel.ts                  管理面板（WebviewPanel 单例）
  templates.ts              占位符替换（纯函数，可单测）
  types.ts                  License / LicenseItem 类型
  writer.ts                 目标目录、文件名与写文件
media/panel.html, panel.js, panel.css   面板的静态模板、脚本与样式
scripts/check-panel.mjs     面板 HTML 与 schema 的一致性校验
```

## 新增功能的做法

- 管理面板是**整个扩展的配置中心**，不只服务某一个功能：
  在 `src/config/schema.ts` 里加一个 section（字段 + 操作按钮）即可，
  存储、Settings Sync 会自动跟上
- 面板按钮通过 `postMessage({ type: "action", action })` 派发，
  由 `src/extension.ts` 的 `runAction` 映射到具体命令
- 面板文案一律在扩展侧用 `vscode.l10n.t()` 取好再传给 webview，
  HTML/JS 里不写死任何语言

## 面板（HTML 优先）

- 面板的三个资源都是独立静态文件：`media/panel.html`、`media/panel.js`、`media/panel.css`
- **外观写在 `media/panel.html` 里**（像普通网页那样写标签结构），
  JS 只负责填值与事件，**不建节点**
  - 文本用占位符：`{{section.<id>.title}}`、`{{field.<key>.label}}`、`{{field.<key>.hint}}`、
    `{{option.<key>.<index>}}`、`{{action.<id>.label}}`、`{{button.save.label}}`
  - 资源类占位符：`cspSource`、`title`、`styleUri`、`scriptUri`
  - 控件用 `data-key="<globalState key>"` 标记，脚本据此填值/取值
  - 按钮用 `data-action="<action>"` 标记，脚本据此派发 `postMessage({ type: "action", action })`
  - 新增占位符时同步更新 `panel.ts` 的 `buildTokens()` 映射
- HTML 与 schema 必须同步：新增字段要同时加 `src/config/schema.ts` 条目与 HTML 里的 `data-key`，
  `node scripts/check-panel.mjs` 会校验两者一致（CI 也会跑）
- `media/panel.js` 里唯一的建节点场景是填充许可证下拉（数据来自 API），其余一律不动 DOM 结构

## 配置存储与同步

- 所有用户配置存在 `context.globalState`（**不是** settings.json）
- `context.globalState.setKeysForSync([...])` 是**全量替换**语义：
  必须在 activate 里一次性列出全部 key，多一次调用会覆盖上一次的声明
- 只有 `globalState` 有 `setKeysForSync`；`workspaceState` 没有
- 令牌**不入存储**：每次现取 `authentication.getSession("github", [], {createIfNone})`，
  绝不写进 globalState / settings / secrets

## 状态栏

- 状态栏项在 `activate` 里创建并 `show()`，因此 `activationEvents` 必须包含
  `onStartupFinished`，否则扩展不会在启动时激活，图标不出现

## GitHub API 与限流

- 列表 `GET https://api.github.com/licenses`，正文 `GET /licenses/{key}`
- 匿名 60 次/小时/IP；用 VS Code 内置 GitHub 登录会话后 5000 次/小时
- 命中限流时抛 `RateLimitError`（带 reset 时间），命令侧提示「登录 GitHub」并重试一次
- 响应头 `x-ratelimit-remaining` 为 0、缺失、或状态 429 时判定为限流
  （实测 GitHub 的 403 有时完全不带限流响应头）

## 打包内容控制

- 用 `package.json` 的 `files` 字段做**白名单**，不使用 `.vscodeignore`
  （vsce 要求二者互斥；同时存在会直接报错）
- `files` 只列运行时必需文件与商店展示文件：`dist/**`、`media/**`、
  `l10n/bundle.l10n*.json`、`package.nls.json`、`package.nls.zh-cn.json`、`README.md`、`LICENSE`
- `package.json` 与 `README.md` 会被 vsce 强制包含；`LICENSE` 必须列进 `files`，否则不会被打进 vsix
- 新增要发布的资源（如 `CHANGELOG.md`）时，同步加进 `files`，否则不会出现

## 国际化（两条独立链路）

- **清单层**（displayName/description、命令标题、分类、配置项描述、视图名）：
  在 `package.json` 里写 `%key%` 占位符，译文放扩展根目录的
  `package.nls.json`（英文源）+ `package.nls.<locale>.json`
- **运行时**（代码里弹出的提示、错误等）：
  用 `vscode.l10n.t("English text", { args })`，源文件 `l10n/bundle.l10n.json`，
  译文 `l10n/bundle.l10n.<locale>.json`；目录由 `package.json` 的 `"l10n": "./l10n"` 指定
- 两条链路的源文件都放英文原文作为 key；新增语言时只加 `<locale>` 文件，不改源文件
- 自用扩展不引入 XLF 母版与翻译工具链：直接手改 JSON，需要新语言就复制对应文件改名
- 新增语言文件后**必须**同步加进 `files`，否则不会打进 vsix

## 发布与 CI

- `.github/workflows/ci.yml`：PR / main 分支校验（typecheck → 面板标记一致性 → bundle → `vsce ls --tree` 检查打包文件清单）
- `.github/workflows/publish.yml`：推送 `v*` 标签或手动触发，发布到 Visual Studio Marketplace
  - 认证用 **OIDC 受信发布**（`vsce publish --oidc`），不存 PAT；需要 `permissions: id-token: write`
  - 标签触发时会校验 tag 版本与 `package.json` 的 version 一致
  - 手动触发可勾选 `dry-run` 只打包不发布
- 真实发布前需在 Marketplace 后台为 publisher + 仓库 + 工作流文件（`publish.yml`）配置受信发布策略

## 约定

- 打包入口固定为 `dist/extension.js`，manifest 的 `main` 指向它
- `tsconfig.json` 显式声明 `"types": ["node", "vscode"]`，否则 Node 内置模块类型解析不到
- 占位符替换用**声明式 token 匹配**（`templates.ts` 的 token 列表），不要按 license key 写 switch 分支
- 静态文案放 `package.json` 的 `contributes`，运行时文案用 `vscode.l10n.t()`
- 本机 esbuild CLI 会静默失败（exit 0 但无产物），必须走 Node API 脚本
