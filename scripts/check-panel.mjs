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

// 分组：groups 数组里的 { id, title }，以及字段上的 group 属性。
// 分组 id 必须落在某个分区里，字段的 group 也必须属于它所在的分区。
const groupSection = new Map();
const fieldGroup = new Map();
{
  const lines = schema.split('\n');
  let currentSection = '';
  let currentField = '';
  for (const line of lines) {
    const sectionMatch = /^ {4}id: '([^']+)'/.exec(line);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      currentField = '';
      continue;
    }
    const groupMatch = /^ {6}\{ id: '([^']+)', title:/.exec(line);
    if (groupMatch) {
      groupSection.set(groupMatch[1], currentSection);
      continue;
    }
    const keyMatch = /^ {8}key: '([^']+)'/.exec(line);
    if (keyMatch) {
      currentField = keyMatch[1];
      continue;
    }
    const fieldGroupMatch = /^ {8}group: '([^']+)'/.exec(line);
    if (fieldGroupMatch && currentField) {
      fieldGroup.set(currentField, fieldGroupMatch[1]);
    }
  }
}

// 字段与分区的对应关系，用于校验字段的 group 归属。
const fieldSection = new Map();
{
  const lines = schema.split('\n');
  let currentSection = '';
  for (const line of lines) {
    const sectionMatch = /^ {4}id: '([^']+)'/.exec(line);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }
    const keyMatch = /^ {8}key: '([^']+)'/.exec(line);
    if (keyMatch) {
      fieldSection.set(keyMatch[1], currentSection);
    }
  }
}

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
for (const [key, groupId] of fieldGroup) {
  if (!groupSection.has(groupId)) {
    problems.push('字段 ' + key + ' 指向不存在的分组 ' + groupId);
  } else if (groupSection.get(groupId) !== fieldSection.get(key)) {
    problems.push('字段 ' + key + ' 的分组 ' + groupId + ' 不在它所属的分区里');
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
  match = /^group\.(.+)\.(.+)\.title$/.exec(token);
  if (match) {
    const [, sectionId, groupId] = match;
    if (!sectionIds.includes(sectionId)) {
      problems.push('占位符 ' + token + ' 指向不存在的分区 ' + sectionId);
    } else if (groupSection.get(groupId) !== sectionId) {
      problems.push('占位符 ' + token + ' 指向不属于该分区的分组 ' + groupId);
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

// ---------------------------------------------------------------------------
// 清单层校验：package.json 里的 %key% 占位符必须在 package.nls.json /
// package.nls.zh-cn.json 中都有译文，且两个语言文件的键集合一致。
// 少一条就会在 VS Code 里显示成原始的 %key%，而 CI 不会报错。
// ---------------------------------------------------------------------------

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);
const nlsEn = JSON.parse(
  fs.readFileSync(path.join(root, 'package.nls.json'), 'utf8')
);
const nlsZh = JSON.parse(
  fs.readFileSync(path.join(root, 'package.nls.zh-cn.json'), 'utf8')
);

const manifestProblems = [];
const usedKeys = new Set();

function collectPlaceholders(value, trail) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/%([^%\s][^%]*)%/g)) {
      usedKeys.add(match[1]);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPlaceholders(item, trail + '[' + index + ']'));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectPlaceholders(item, trail + '.' + key);
    }
  }
}

for (const [key, value] of Object.entries(manifest)) {
  if (key === 'l10n' || key === 'files') {
    continue;
  }
  collectPlaceholders(value, key);
}

for (const key of usedKeys) {
  if (!(key in nlsEn)) {
    manifestProblems.push('package.json 用到的占位符 %' + key + '% 不在 package.nls.json 中');
  }
  if (!(key in nlsZh)) {
    manifestProblems.push('package.json 用到的占位符 %' + key + '% 不在 package.nls.zh-cn.json 中');
  }
}

for (const key of Object.keys(nlsEn)) {
  if (!(key in nlsZh)) {
    manifestProblems.push('package.nls.json 的 ' + key + ' 在中文文件里缺失');
  }
}
for (const key of Object.keys(nlsZh)) {
  if (!(key in nlsEn)) {
    manifestProblems.push('package.nls.zh-cn.json 的 ' + key + ' 在英文文件里缺失');
  }
}

if (manifestProblems.length > 0) {
  console.error('清单本地化不一致：');
  for (const problem of manifestProblems) {
    console.error('  - ' + problem);
  }
  process.exit(1);
}

console.log(
  '清单本地化一致：' + usedKeys.size + ' 个占位符，' + Object.keys(nlsEn).length + ' 条译文'
);

// ---------------------------------------------------------------------------
// 运行时本地化校验：代码里 vscode.l10n.t('...') 用到的每个英文原文，
// 必须在 l10n/bundle.l10n.json 与 l10n/bundle.l10n.zh-cn.json 里都有条目。
// 漏译不会报错，只会在对应语言下回落显示英文原文，很难察觉。
// ---------------------------------------------------------------------------

const bundleEn = JSON.parse(
  fs.readFileSync(path.join(root, 'l10n', 'bundle.l10n.json'), 'utf8')
);
const bundleZh = JSON.parse(
  fs.readFileSync(path.join(root, 'l10n', 'bundle.l10n.zh-cn.json'), 'utf8')
);

function collectRuntimeKeys(dir, trail = '') {
  const found = new Map();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [key, file] of collectRuntimeKeys(full, trail + entry.name + '/')) {
        if (!found.has(key)) {
          found.set(key, file);
        }
      }
      continue;
    }
    if (!entry.name.endsWith('.ts')) {
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    const pattern = /vscode\.l10n\.t\(\s*(['"])(.*?)\1/gms;
    let match;
    while ((match = pattern.exec(text))) {
      const key = match[2];
      if (!found.has(key)) {
        found.set(key, trail + entry.name);
      }
    }
  }
  return found;
}

const runtimeKeys = collectRuntimeKeys(path.join(root, 'src'));
const runtimeProblems = [];

for (const [key, file] of runtimeKeys) {
  if (!(key in bundleEn)) {
    runtimeProblems.push(file + ' 里的 ' + JSON.stringify(key) + ' 不在 l10n/bundle.l10n.json 中');
  }
  if (!(key in bundleZh)) {
    runtimeProblems.push(file + ' 里的 ' + JSON.stringify(key) + ' 不在 l10n/bundle.l10n.zh-cn.json 中');
  }
}

for (const key of Object.keys(bundleEn)) {
  if (!(key in bundleZh)) {
    runtimeProblems.push('l10n/bundle.l10n.json 的 ' + key + ' 在中文文件里缺失');
  }
}
for (const key of Object.keys(bundleZh)) {
  if (!(key in bundleEn)) {
    runtimeProblems.push('l10n/bundle.l10n.zh-cn.json 的 ' + key + ' 在英文文件里缺失');
  }
}

if (runtimeProblems.length > 0) {
  console.error('运行时本地化不一致：');
  for (const problem of runtimeProblems) {
    console.error('  - ' + problem);
  }
  process.exit(1);
}

console.log(
  '运行时本地化一致：' + runtimeKeys.size + ' 个 key，' + Object.keys(bundleEn).length + ' 条译文'
);
