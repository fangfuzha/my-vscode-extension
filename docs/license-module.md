# License 模块

给项目生成 LICENSE 文件的一整套能力：取许可证正文、推断作者与年份、替换占位符、决定文件名并写盘。

## 目录结构

```
src/license/
  api.ts        GitHub Licenses API、登录会话令牌、限流错误
  commands.ts   三个命令的业务流程与限流兜底
  git.ts        从 git 推断作者与首次提交年份
  templates.ts  占位符替换与惯用文件名表
  types.ts      License / LicenseItem 类型
  writer.ts     目标目录、文件名解析与写文件
```

## 功能详解

### 1. 命令

| 命令 | 标题 | 说明 |
| --- | --- | --- |
| `my-vscode-extension.license.add` | Add License | 弹 QuickPick 选一个许可证并生成文件 |
| `my-vscode-extension.license.addMultiple` | Add Multiple Licenses | 支持多选的 QuickPick，一次生成多个许可证文件 |
| `my-vscode-extension.license.addDefault` | Add Default License | 直接使用面板里配置的默认许可证，无需交互选择 |

管理面板的 License 分区也提供同样的四个操作（加载列表、添加单个、添加多个、添加默认），
通过 `postMessage({ type: 'action', action })` 派发到 `src/extension.ts` 的 `runAction`。

三个命令共用一条主链路：

```
取列表 → 选许可证 → 取正文 → 推断作者/年份 → 替换占位符 → 决定文件名 → 写盘
```

### 2. GitHub Licenses API

- 列表：`GET https://api.github.com/licenses`
- 正文：`GET https://api.github.com/licenses/{key}`
- 请求头：`Accept: application/vnd.github+json`、`X-GitHub-Api-Version: 2022-11-28`、自定义 `User-Agent`

**非常见许可证**：GitHub 的「常用许可证」列表里没有，但 `/licenses/{key}` 能取到正文的一批许可证
（BSD-4-Clause、CC-BY-4.0、ISC、LGPL-3.0、WTFPL），在 QuickPick 里单独分组展示。

### 3. 限流处理

匿名调用是 60 次/小时/IP，登录 GitHub 后是 5000 次/小时。

判定限流的条件（`api.ts` 的 `request`）：

- 状态码 `403` 或 `429`
- 并且 `x-ratelimit-remaining` 为 `0`、缺失、或是 `429`

> 实测 GitHub 的部分 403 完全不带限流响应头（边缘节点直接拦截），所以「缺失」也按限流处理，
> 否则用户只会看到一个没有解释的 403。

`RateLimitError` 携带可选的 `resetAt`（来自 `x-ratelimit-reset`）。

命令侧（`commands.ts` 的 `withRateLimitRetry`）在捕获限流后：

1. 弹出错误提示；带 `resetAt` 时告知具体重试时间
2. 同时给出「Sign in to GitHub」按钮
3. 用户点同意 → `getSessionToken(true)` 触发交互式登录 → 用新令牌重试一次
4. 用户不登录或登录失败 → 原样抛出错误

### 4. GitHub 账号与登录

- 令牌来源：`vscode.authentication.getSession('github', [], { createIfNone })`
- **令牌不入存储**：不写 `globalState`，不写 `settings.json`，不进 secrets
- `getSessionToken(false)` 静默获取（未登录返回 `undefined`，走匿名配额）
- `getSessionToken(true)` 会弹出登录
- `getSessionAccount()` 用 `getAccounts('github')` 取当前账号名
- `signOut()` 用 `clearSessionPreference: true` 清除偏好

管理面板的 **GitHub account** 分区显示「Signed in as {0}」或「Not signed in (anonymous API limit: 60 requests/hour)」。
「登录 GitHub」与「退出登录」互斥：未登录时只显示登录按钮，已登录时只显示退出登录按钮，
面板根据 `getSession(false)` 的结果切换（HTML 上用 `data-auth-show="signedIn|signedOut"` 标记，脚本只改 `hidden` 属性）。

### 5. 作者与年份推断

面板里留空时自动推断（`git.ts`）：

| 字段 | 推断来源 | 命令 |
| --- | --- | --- |
| 作者 | `git config user.name` | `git -C <folder> config user.name` |
| 年份 | 仓库**首次提交**的年份 | `git -C <folder> log --reverse --format=%ad --date=format:%Y` 取第一行 |

两者都失败时：作者为空，年份回落到当前年份。

### 6. 占位符替换

上游许可证正文用固定的占位符标记作者与年份，`templates.ts` 用声明式 token 列表统一替换，
新增许可证时不需要再按 key 写 switch 分支。

作者 token：

```
[fullname]  <name of author>  [name of copyright owner]  [copyright holder]
```

年份 token：

```
<year>  [year]  [yyyy]
```

**WTFPL 特例**：它的年份是硬编码的 `2004` 且出现两次（一次是版权声明，一次是正文说明），
所以只替换第二处。

### 7. 文件名与目标目录

**目标目录**（`writer.ts` 的 `resolveTargetFolder`）：

1. 当前活动编辑器所在的工作区目录
2. 单根工作区时直接用该根目录
3. 多根工作区时弹 `showWorkspaceFolderPick`
4. 没有工作区 → 报「没有可用于创建许可证的目录」

**文件名**（`resolveFileName`）：

- 基础名：开启 `license.useConventionalFilename` 时优先用惯用名，否则用面板填写的名字（默认 `LICENSE`）
- 多选时追加 `-<SPDX ID>` 后缀，避免互相覆盖
- 最后拼接扩展名（`license.extension`：无 / `.md` / `.txt`）

惯用文件名表（`CONVENTIONAL_FILENAMES`）：

| 许可证 key | 文件名 |
| --- | --- |
| `unlicense` | `UNLICENSE` |
| `gpl-2.0` | `COPYING` |
| `gpl-3.0` | `COPYING` |

**写盘**：`writeLicenseFile` 先检查文件是否存在，存在则弹**模态**确认框
（「{0} already exists. Overwrite it?」），用户不确认就不写。

### 8. 管理面板的联动

「Load license list」按钮会调用 `GET /licenses`，把结果通过
`postMessage({ type: 'licenses', items })` 送到面板，填进许可证下拉框。
这是 `media/panel.js` 里唯一创建 DOM 节点的地方（其余只填值不改结构）。

失败时通过 `postMessage({ type: 'error', message })` 回传可读的错误文案，
限流错误会显示重置时间或提示登录。

## 配置项

| Key | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `license.default` | select | 空 | 默认许可证，需先加载列表才能选 |
| `license.author` | text | 空 | 留空则用 `git config user.name` |
| `license.year` | text | 空 | 留空则用首次提交年份 |
| `license.filename` | text | `LICENSE` | 自定义文件名 |
| `license.extension` | select | 空 | 无后缀 / `.md` / `.txt` |
| `license.useConventionalFilename` | checkbox | `true` | 启用 GPL、Unlicense 的惯用文件名 |

密钥类字段不进 Settings Sync；以上六项全部是普通字段，都参与同步。
