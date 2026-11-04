// 校验 media/panel.html 的静态标记与 src/config/schema.ts 是否一致。
// 用法：node scripts/check-panel.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'media', 'panel.html'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'src', 'config', 'schema.ts'), 'utf8');

// schema.ts 里不同层级用缩进区分：分区 id 缩进 4，字段 key 与操作 id 缩进 8
const sectionIds = [...schema.matchAll(/^ {4}id: '([^']+)'/gm)].map((m) => m[1]);
const fieldKeys = [...schema.matchAll(/^ {8}key: '([^']+)'/gm)].map((m) => m[1]);
const actionIds = [...schema.matchAll(/^ {8}id: '([^']+)'/gm)].map((m) => m[1]);
const actionNames = [...schema.matchAll(/action: '([^']+)'/g)].map((m) => m[1]);

const dataKeys = [...new Set([...html.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]))];
const dataActions = [...new Set([...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]))];
const tokens = [...new Set([...html.matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => m[1]))];

const problems = [];

for (const key of dataKeys) {
  if (!fieldKeys.includes(key)) {
    problems.push('HTML 的 data-key ' + key + ' 在 schema 中不存在');
  }
}
for (const key of fieldKeys) {
  if (!dataKeys.includes(key)) {
    problems.push('schema 的字段 ' + key + ' 没有在 HTML 中出现');
  }
}
for (const action of dataActions) {
  if (!actionNames.includes(action)) {
    problems.push('HTML 的 data-action ' + action + ' 在 schema 中不存在');
  }
}

const STATIC_TOKENS = [
  'cspSource',
  'picoUri',
  'title',
  'styleUri',
  'scriptUri',
  'heading',
  'button.save.label',
  'button.reset.label'
];

for (const token of tokens) {
  if (STATIC_TOKENS.includes(token)) {
    continue;
  }
  let match = /^section\.(.+)\.(title|description)$/.exec(token);
  if (match) {
    if (!sectionIds.includes(match[1])) {
      problems.push('占位符 ' + token + ' 指向不存在的分区 ' + match[1]);
    }
    continue;
  }
  match = /^field\.(.+)\.(label|hint)$/.exec(token);
  if (match) {
    if (!fieldKeys.includes(match[1])) {
      problems.push('占位符 ' + token + ' 指向不存在的字段 ' + match[1]);
    }
    continue;
  }
  match = /^option\.(.+)\.\d+$/.exec(token);
  if (match) {
    if (!fieldKeys.includes(match[1])) {
      problems.push('占位符 ' + token + ' 指向不存在的字段 ' + match[1]);
    }
    continue;
  }
  match = /^action\.(.+)\.label$/.exec(token);
  if (match) {
    if (!actionIds.includes(match[1])) {
      problems.push('占位符 ' + token + ' 指向不存在的操作 ' + match[1]);
    }
    continue;
  }
  problems.push('占位符 ' + token + ' 的命名不符合约定');
}

if (problems.length > 0) {
  console.error('面板标记与 schema 不一致：');
  for (const problem of problems) {
    console.error('  - ' + problem);
  }
  process.exit(1);
}

console.log('面板标记一致：' + dataKeys.length + ' 个字段、' + dataActions.length + ' 个操作、' + tokens.length + ' 个占位符');
