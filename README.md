# My VS Code Extension

一个 TypeScript 编写的 VS Code 扩展脚手架，开箱即用，已接入中英文国际化与自动发布流程。

## 包含什么

- 扩展骨架：TypeScript 源码、esbuild 打包、F5 调试配置
- 国际化：清单层与运行时两套文案，支持简体中文
- 自动发布：推标签即可发布到 Visual Studio Marketplace（OIDC 受信发布，无需 PAT）

当前**不包含任何命令或设置项**，可直接在 `src/extension.ts` 中添加功能。

## 运行

1. 在 VS Code 中打开本项目
2. 按 <kbd>F5</kbd> 启动 Extension Development Host

## 多语言

扩展支持简体中文与英文两套文案：

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

## 自动发布

仓库内置 GitHub Actions 工作流：

- 推送到 `main` 或提交 PR 时自动跑校验（类型检查、构建、打包文件清单检查）
- 推送 `v*` 标签时自动打包并发布到 Visual Studio Marketplace

发布使用 **OIDC 受信发布**，无需在仓库里保存 PAT：
工作流通过 `id-token: write` 权限向 GitHub 换取 OIDC 令牌，再向 Marketplace 换取短期会话令牌完成发布。
前提是已在 Marketplace 后台为该 publisher、仓库与工作流文件 `publish.yml` 配置好受信发布策略。
