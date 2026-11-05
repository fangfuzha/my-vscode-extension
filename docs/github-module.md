# GitHub 链接模块

在浏览器里打开当前文件在 GitHub 上的对应位置，带行号定位。

对应源码：`src/github/`，命令 `my-vscode-extension.github.openInGitHub`
（面板文案：**我的扩展: 在 GitHub 打开**）。

## 为什么自己实现

最初的方案是转发第三方扩展 `ziyasal.vscode-open-in-github` 的
`extension.openInGitHub` 命令。读了它的源码后放弃了，原因有三：

1. **命令不返回 URL**，只有副作用（开浏览器 / 写剪贴板）。想在面板里显示链接、
   或把链接填进别处，就拿不到结果。
2. **传 `fsPath` 会被忽略**。它的判断顺序是「有活动编辑器就用编辑器 → 否则看
   `args.fsPath` → 都没有就走一条作者自己标注为 broken 的分支」，程序化调用容易踩坑。
3. **URL 永远锚定到提交 SHA**。`openInGitHub.useCommitSHAInURL` 这个配置项名不副实，
   两种取值下用的都是 SHA，于是未提交的本地改动在网页上完全看不到。

自己实现后这三点都解决了：链接能拿到、能按分支或提交生成、并且在有未提交改动时
明确提示用户。

## 实现分层

| 文件 | 职责 | 是否纯函数 |
| --- | --- | --- |
| `remote.ts` | 解析 remote URL、构造 GitHub URL | 是，可单测 |
| `git.ts` | 读仓库根目录、分支、HEAD、remote、文件状态 | 否，走 git 命令行 |
| `index.ts` | 命令注册、菜单、提示文案、打开链接 | 否 |

`remote.ts` 的自测脚本是 `scripts/check-github.mjs`，跑在 `pnpm run compile`
的产物上（CI 里对应 `compile` + `check-github` 两步）。

## 链接是怎么算出来的

1. 用 `git rev-parse --show-toplevel` 从当前文件向上找仓库根目录。
   走 git 命令而不是自己找 `.git` 目录，worktree 与 submodule 都能正确处理。
2. 取当前分支：`git rev-parse --abbrev-ref HEAD`。
   detached HEAD 时返回 `HEAD`，此时改用提交 SHA。
3. 取 remote 地址，按以下优先级：
   当前分支配置的 remote → `origin` → remote 列表里的第一个。
4. 解析 remote URL，取出 host / owner / repo。支持的写法：

   | 写法 | 解析结果 |
   | --- | --- |
   | `git@github.com:owner/repo.git` | github.com / owner / repo |
   | `ssh://git@github.com/owner/repo.git` | 同上 |
   | `https://github.com/owner/repo.git` | 同上 |
   | `https://token@github.com/owner/repo.git` | 同上 |
   | `git@ghe.example.com:org/team/repo.git` | ghe.example.com / org/team / repo |

   自建 GitHub Enterprise 的 owner 允许多段，路径里不会出现 `.git` 后缀。
5. 生成 URL：

   ```text
   https://{host}/{owner}/{repo}/blob/{ref}/{相对路径}#L10-L20
   ```

   `ref` 默认是分支名；分支名含斜杠时改用提交 SHA，因为 GitHub 无法从
   `blob/feature/x/src/app.ts` 里判断斜杠属于分支还是路径。
   路径按段编码（空格变 `%20`，斜杠保留），分支名同理。
6. 行号：取编辑器选区的首尾行（1 基）。单行是 `#L10`，多行是 `#L10-L20`。

## 引用用分支还是提交

面板「GitHub links」分区有一个开关：

| 配置项 | 含义 |
| --- | --- |
| `github.useCommitSha` | 始终使用提交 SHA 而不是分支名（默认关闭） |

默认用分支名，链接指向该分支的最新内容。只有需要固定到某次提交时才打开这个开关。

## 未提交改动的处理

用 `git status --porcelain` 判断文件状态：

- `clean`：直接打开；
- `modified` / `untracked`：打开后弹一条警告，提示链接指向最后一次提交，
  本地改动在网页上不可见。

不会因为有本地改动就拒绝打开——大多数时候用户就是想看已提交的内容。

## 菜单入口

| 位置 | 条件 |
| --- | --- |
| 命令面板 | 无条件 |
| 编辑器右键菜单 | `resourceScheme == file` |
| 资源管理器右键菜单 | `resourceScheme == file` |

没有放进编辑器标题栏：那里已经有 SVG 优化按钮，再加一个会显得拥挤。

## 错误提示

| 情况 | 提示 |
| --- | --- |
| 没有活动编辑器 | 没有活动的编辑器或未选中文件 |
| 文件不在 git 仓库里 | 当前文件不在 Git 仓库中 |
| 仓库没配 remote | 该仓库没有配置 Git remote |
| remote URL 解析不了 | 无法解析 Git remote 地址：{0} |
| 仓库还没有提交 | 该仓库还没有任何提交 |

## 日志

走 `src/logger.ts` 的 `logInfo` / `logError`，在「My Extension」输出通道里能看到
生成的完整 URL、仓库名、引用和文件状态。
