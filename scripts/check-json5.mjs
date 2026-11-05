// 校验 syntaxes/json5.json 的 JSON5 语法高亮规则。
// 用法：node scripts/check-json5.mjs
//
// TextMate 会把一段文本切成多个 token（引号、注释、标点各自成段），
// 所以断言按「某个 token 的文本包含目标片段，且命中了目标 scope」来判断。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import onigModule from 'vscode-oniguruma';
import textmate from 'vscode-textmate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const grammarPath = path.join(root, 'syntaxes', 'json5.json');

const wasm = fs.readFileSync(
  path.join(root, 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm')
);
await onigModule.loadWASM(wasm.buffer);

const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));

const registry = new textmate.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (sources) => new onigModule.OnigScanner(sources),
    createOnigString: (str) => new onigModule.OnigString(str)
  }),
  loadGrammar: async (scopeName) =>
    scopeName === grammar.scopeName ? grammar : null
});

const sample = [
  '{',
  '  // 行注释',
  '  /** 文档注释 */',
  '  unquoted: "value",',
  '  $dollar_key: 1,',
  '  ключ: 2,',
  "  single: 'text',",
  "  escaped: 'a\\vb\\x41\\u00e9',",
  "  bad: 'a\\qb',",
  "  nul: 'a\\0b',",
  '  hex: 0xDEADBEEF,',
  '  leading: .5,',
  '  trailing: 5.,',
  '  exponent: 1e-3,',
  '  infinite: +Infinity,',
  '  negative: -Infinity,',
  '  notANumber: NaN,',
  '  list: [1, 2,],',
  '  flag: true,',
  '  nothing: null,'
].join('\n');

const tmGrammar = await registry.loadGrammar(grammar.scopeName);
if (!tmGrammar) {
  console.error('无法加载 grammar：' + grammar.scopeName);
  process.exit(1);
}

const lines = sample.split('\n');
let ruleStack = textmate.INITIAL;
const tokens = [];

for (const line of lines) {
  const result = tmGrammar.tokenizeLine(line, ruleStack);
  ruleStack = result.ruleStack;
  for (const token of result.tokens) {
    tokens.push({
      text: line.slice(token.startIndex, token.endIndex),
      scopes: token.scopes
    });
  }
}

const problems = [];

function expectScope(fragment, scope) {
  const hit = tokens.find(
    (token) => token.text.includes(fragment) && token.scopes.includes(scope)
  );
  if (!hit) {
    const related = tokens
      .filter((token) => token.text.includes(fragment))
      .map((token) => token.scopes.join(' | '));
    problems.push(
      '期望 ' +
        JSON.stringify(fragment) +
        ' 命中 scope ' +
        scope +
        '，实际为 ' +
        (related.length ? related.join(' / ') : '(没有相关 token)')
    );
  }
}

// 注释
expectScope('行注释', 'comment.line.double-slash.json5');
expectScope('文档注释', 'comment.block.documentation.json5');
// 字符串：单引号与双引号分别着色
expectScope('text', 'string.quoted.single.json5');
expectScope('value', 'string.quoted.double.json5');
// JSON5 2.x 的转义：\v、\0、\xHH、\uXXXX
expectScope('\\v', 'constant.character.escape.json5');
expectScope('\\x41', 'constant.character.escape.json5');
expectScope('\\u00e9', 'constant.character.escape.json5');
// 非法转义要标出来
expectScope('\\q', 'invalid.illegal.unrecognized-string-escape.json5');
expectScope('\\0', 'constant.character.escape.json5');
// 未加引号的键：ASCII、$ 前缀、Unicode 字母
expectScope('unquoted', 'string.key.json5');
expectScope('$dollar_key', 'string.key.json5');
expectScope('ключ', 'string.key.json5');
// 数字：十六进制、.5、5.、指数
expectScope('0xDEADBEEF', 'constant.hex.numeric.json5');
expectScope('.5', 'constant.dec.numeric.json5');
expectScope('5.', 'constant.dec.numeric.json5');
expectScope('1e-3', 'constant.dec.numeric.json5');
// 常量
expectScope('+Infinity', 'constant.language.json5');
expectScope('-Infinity', 'constant.language.json5');
expectScope('NaN', 'constant.language.json5');
expectScope('true', 'constant.language.json5');
expectScope('null', 'constant.language.json5');

// JSON5 允许尾逗号，不能误报分隔符错误
for (const scope of [
  'invalid.illegal.expected-array-separator.json5',
  'invalid.illegal.expected-dictionary-separator.json5'
]) {
  const hit = tokens.find((token) => token.scopes.includes(scope));
  if (hit) {
    problems.push('尾逗号被误报为错误：' + JSON.stringify(hit.text));
  }
}

if (problems.length > 0) {
  console.error('JSON5 语法高亮规则不符合预期：');
  for (const problem of problems) {
    console.error('  - ' + problem);
  }
  process.exit(1);
}

console.log(
  'JSON5 语法高亮规则正常：' +
    tokens.length +
    ' 个 token；注释、单双引号字符串、JSON5 2.x 转义、标识符键与各类数字均正确着色'
);
