## 面板本地化是怎么做的

管理面板**不直接处理语言**。它只负责渲染「已经翻译好的字符串」，翻译在扩展侧完成。

### 链路

1. **schema 里定义文案**（`src/config/schema.ts`）：
   每条面向用户的文案都用 `vscode.l10n.t('English text')` 包起来，key 就是英文原文本身。
2. **扩展侧取好文案**（`src/panel/panel.ts` 的 `buildTokens()`）：
   遍历 schema，把每条文案取出后组装成 `占位符 → 译文` 的映射。
3. **注入 HTML**（`media/panel.html`）：
   模板里只写占位符（`{{field.svg.mergePaths.label}}`），
   `renderHtml()` 用一次正则把它们替换成当前语言的最终文本。
4. **翻译表**：`l10n/bundle.l10n.json`（英文源）+ `l10n/bundle.l10n.zh-cn.json`（中文），
   目录由 `package.json` 的 `"l10n": "./l10n"` 指定，由 VS Code 按用户 locale 自动选择。

### 为什么不让面板自己查表

这是经过源码验证的结论，不要轻易改：

- **VS Code 的 locale 在会话内固定**：`currentLanguage` 来自 `environment.appLanguage`，
  在 `ExtHostLocalizationService` 构造时确定。「面板自动切换语言」在运行期不会真的发生。
- **模块顶层的 `vscode.l10n.t()` 是安全的**：扩展宿主 `_doLoadModule` 里先
  `await initializeLocalizedMessages(e)` 再 `require` 扩展代码，
  所以 `schema.ts` 的模块级常量在 import 时就能拿到正确译文。
- **面板侧查表需要第二份翻译源**：`schema.ts` 的 `label`/`hint` 得从「已翻译文本」改回「英文 key」，
  而扩展侧约 25 个 toast/错误提示仍只能用 `vscode.l10n.t()`。
  要么把译文复制到 `media/`，要么让面板 fetch `l10n/` 下的原文件——
  后者要放开 CSP 的 `connect-src`（当前是 `default-src 'none'`）并把 `l10n/` 加进 `localResourceRoots`。
- **校验体系会重写**：`check-panel.mjs` 现在审计「`vscode.l10n.t()` 调用 ↔ bundle 文件」，
  改成面板自持翻译表后审计对象就变了。

### VS Code l10n 的两个容易踩的细节

- **英文源文件 VS Code 从不读**：`initializeLocalizedMessages` 在 `currentLanguage === 'en'` 时直接 return，
  不加载 `bundle.l10n.json`。它只是给翻译工具链当 key 清单用。
- **没有 locale 回退链**：非英文时只加载 `bundle.l10n.<精确 locale>.json` 这一个文件，
  没有「zh-cn 找不到退 zh 再退 en」。所以文件名必须和用户的 VS Code 显示语言精确对上。

### 静态贡献点走另一条链路

`package.json` 里的 `%key%` 占位符（命令标题、分类、扩展描述）对应 `package.nls.json` /
`package.nls.zh-cn.json`，与运行时链路是两套独立文件，互不干扰。