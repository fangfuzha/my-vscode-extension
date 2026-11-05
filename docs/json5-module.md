# JSON5 语法高亮模块

本扩展接管 `.json5` 文件的语法高亮，规则按 **JSON5 2.x 最新规范**（json5.org）编写。

实现参考了社区扩展 [mrmlnc/vscode-json5](https://github.com/mrmlnc/vscode-json5)（MIT，
其 grammar 又源自 [wiredmax/language-json5](https://github.com/wiredmax/language-json5)，同为 MIT）。
上游版权与许可见根目录的 `NOTICE.md`，该文件会随 vsix 一起分发。

## 组成

| 文件 | 职责 |
| --- | --- |
| `syntaxes/json5.json` | TextMate grammar，scopeName `source.json5` |
| `json5.configuration.json` | 语言配置：注释、括号与自动补全对 |
| `scripts/check-json5.mjs` | 用 vscode-textmate 跑一遍分词，断言规则符合预期 |

## 覆盖的 JSON5 2.x 特性

| 特性 | 说明 |
| --- | --- |
| 单引号字符串 | `string.quoted.single.json5`，与双引号字符串区分着色 |
| 双引号字符串 | `string.quoted.double.json5` |
| 行注释 / 块注释 / 文档注释 | `//`、`/* */`、`/** */` |
| 未加引号的键 | 完整 ECMAScript IdentifierName：ASCII、`$`、Unicode 字母（如 `ключ`） |
| 十六进制数字 | `0xDEADBEEF`，位数不限 |
| 前导 / 尾随小数点 | `.5`、`5.` |
| 指数 | `1e-3` |
| 有符号无穷与 NaN | `+Infinity`、`-Infinity`、`NaN` |
| 转义序列 | `\'`、`\"`、`\\`、`\b`、`\f`、`\n`、`\r`、`\t`、`\v`、`\0`、`\xHH`、`\uXXXX` |
| 尾逗号 | 数组与对象都允许，不报分隔符错误 |
| 非法转义 | 标为 `invalid.illegal.unrecognized-string-escape.json5` |

相比 mrmlnc.vscode-json5 的那份 grammar，这里补上了它按 JSON5 1.x 时代规范遗漏的部分：
`\v`、`\0`、`\xHH` 转义，`.5` / `5.` 形式的数字，`+Infinity`，
以及按完整 IdentifierName 匹配未加引号的键（原实现只按单字符匹配）。

## 冲突提示

本扩展声明了 language id `json5` 与 scopeName `source.json5`。
若同时安装了 **mrmlnc.vscode-json5**，两者会争抢同一个语言，请**二选一**：
装本扩展的话，卸载 mrmlnc.vscode-json5 即可。

## 自测

```bash
node scripts/check-json5.mjs
```

脚本用 `vscode-textmate` + `vscode-oniguruma` 真正跑一遍分词，
断言注释、字符串、各类转义、标识符键与各类数字都命中了预期的 scope，
并确认尾逗号不会被误报成错误。CI 里也会跑这一步。
