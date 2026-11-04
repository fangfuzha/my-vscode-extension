# MCP 模块（Context7 + DeepWiki）

MCP（Model Context Protocol）相关能力统一放在这一篇里说明。扩展注册了两个 MCP 服务器：
**Context7**（最新库文档检索）与 **DeepWiki**（公开仓库的 AI 生成文档）。

## 目录结构

```
src/context7/mcp.ts   Context7 MCP 服务器的定义与认证
src/deepwiki/mcp.ts   DeepWiki MCP 服务器的定义与认证
```

两个文件结构对称，各自导出一个 `register*Mcp(context, store)`，返回 `{ refresh }`，
由 `src/extension.ts` 在 `activate` 里注册。

## 清单层

`contributes.mcpServerDefinitionProviders` 声明了两个 provider：

```json
{
  "id": "fangfuzha/context7",
  "label": "Context7"
},
{
  "id": "fangfuzha/deepwiki",
  "label": "DeepWiki"
}
```

VS Code 会为每个 provider 调用 `vscode.lm.registerMcpServerDefinitionProvider` 注册的
`provideMcpServerDefinitions()`，返回一个 `McpHttpServerDefinition`。

## Context7

### 连接地址

| 模式 | 地址 |
| --- | --- |
| token（默认） | `https://mcp.context7.com/mcp` |
| oauth | `https://mcp.context7.com/mcp/oauth` |

### 认证

- **token 模式**：面板里填写的 API key 存在 `context.secrets`（键名 `context7.apiKey`），
  作为 `Authorization: Bearer <key>` 头注入请求
- **oauth 模式**：不注入任何头，认证交给 VS Code 的 OAuth 流程

### 密钥可用性校验

token 模式在构造请求头之前会先校验密钥是否仍然可用：

1. 前缀必须是 `ctx7sk-`，否则直接判为 `invalid`
2. 向 `https://context7.com/api/v2/libs/search?libraryName=react` 发一个 `HEAD` 请求，带同样的 Bearer 头
3. 状态码映射：
   - `401` / `403` → `invalid`
   - `402` / `429` / 2xx → `valid`
   - 其他 → `unknown`
   - 网络异常 → `unknown`
4. 请求超时 10 秒（`AbortSignal.timeout`）

结果带 TTL 缓存，避免每次刷新都打一次网络：

| 结果 | 缓存时长 |
| --- | --- |
| `valid` | 10 分钟 |
| `invalid` | 5 分钟 |
| `unknown` | 1 分钟 |

同一个密钥的并发请求会合并（in-flight 去重），只发一次网络请求。

校验为 `invalid` 时，扩展**不会阻断使用**，而是退化成匿名访问，并弹一次警告：
「Context7: the configured API key was rejected. Continuing with anonymous access.」
（同一个密钥只警告一次）。

### 缓存击穿标识

`McpHttpServerDefinition` 的第三个参数是「版本串」，用密钥的 FNV-1a 指纹（8 位十六进制）拼成
`<mode>:<fingerprint>`。密钥变了指纹就变，VS Code 侧的定义缓存随之失效并重新拉取。
匿名模式或 oauth 模式下这一段固定为 `anonymous`。

### 命令

| 命令 | 标题 | 出现条件 |
| --- | --- | --- |
| `my-vscode-extension.context7.useTokenMode` | Switch to Context7 API Token Mode | 当前不在 oauth 模式 |
| `my-vscode-extension.context7.checkApiKey` | Check Context7 API Key | 当前不在 oauth 模式 |
| `my-vscode-extension.context7.useOAuthMode` | Switch to Context7 OAuth Mode | 当前在 oauth 模式 |

三个命令都会写回 `context7.authMode` 并触发 `refresh()`。

### 上下文

`setContext('myVscodeExtension.context7AuthMode', mode)` 让命令面板按当前模式显示不同的命令。

## DeepWiki

### 连接地址

| 模式 | 地址 | 认证头 |
| --- | --- | --- |
| public（默认） | `https://mcp.deepwiki.com/mcp` | 无 |
| devin | `https://mcp.devin.ai/mcp` | `Authorization: Bearer <Devin API key>` |

### 密钥存放

Devin API key 存在 `context.secrets`（键名 `deepwiki.apiKey`），
面板里是密码输入框，清空即删除。面板的 **Get Devin API key** 按钮会打开
`https://app.devin.ai/settings/api-keys`。

### 刷新机制

- 监听 `context.secrets.onDidChange`，密钥变化时重新读取并触发定义刷新
- `provideMcpServerDefinitions` 每次都按当前模式重新计算地址与请求头
- `resolveMcpServerDefinition` 在 VS Code 真正建立连接时再刷新一次请求头

## 两者共有的机制

| 机制 | 说明 |
| --- | --- |
| 定义刷新 | 每个模块持有一个 `vscode.EventEmitter<void>`，作为 `onDidChangeMcpServerDefinitions` 传给 provider |
| 密钥变更监听 | `context.secrets.onDidChange` 触发 `refresh()` |
| 面板保存联动 | 管理面板保存或重置后，`runAction('refreshContext7')` / `runAction('refreshDeepWiki')` 会重新读取配置 |
| 密钥存储 | 一律 `context.secrets`，不进 `globalState`、不参与 Settings Sync |
| 令牌来源 | Context7 用面板填写的密钥；DeepWiki 用 Devin 密钥；两者都不使用 GitHub 会话令牌 |

## 配置项

| Key | 类型 | 默认值 | 存储 | 说明 |
| --- | --- | --- | --- | --- |
| `context7.authMode` | select | `token` | globalState | `token` 或 `oauth` |
| `context7.apiKey` | password | 空 | secrets | Context7 API key，可留空走匿名访问 |
| `deepwiki.authMode` | select | `public` | globalState | `public` 或 `devin` |
| `deepwiki.apiKey` | password | 空 | secrets | Devin API key，devin 模式必需 |

## 故障排查

| 现象 | 排查方向 |
| --- | --- |
| MCP 服务器列表里看不到 Context7 | 扩展是否激活；`activationEvents` 含 `onStartupFinished` |
| Context7 报 401 | 密钥被拒，扩展会自动降级为匿名访问并弹警告 |
| Context7 校验总是 `unknown` | 网络不通或上游无响应，10 秒超时后会退回匿名访问 |
| DeepWiki 私有仓库取不到 | 切到 devin 模式并填写有效的 Devin API key |
| 改了密钥但连接没变 | 密钥变更会触发 `refresh()`；仍不生效时重启窗口 |
