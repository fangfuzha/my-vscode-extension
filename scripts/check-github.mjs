// 校验 src/github/remote.ts 的纯函数：remote 解析与 URL 构造。
// 用法：pnpm run compile && node scripts/check-github.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 直接跑 tsc 的编译产物，避免在脚本里手写 TypeScript 转译。
const { parseRemoteUrl, buildBlobUrl } = await import(
  pathToFileURL(path.join(root, 'out', 'github', 'remote.js')).href
);

// --- parseRemoteUrl ---
assert.deepEqual(parseRemoteUrl('git@github.com:owner/repo.git'), {
  host: 'github.com',
  owner: 'owner',
  repo: 'repo'
});
assert.deepEqual(parseRemoteUrl('https://github.com/owner/repo.git'), {
  host: 'github.com',
  owner: 'owner',
  repo: 'repo'
});
assert.deepEqual(parseRemoteUrl('https://github.com/owner/repo'), {
  host: 'github.com',
  owner: 'owner',
  repo: 'repo'
});
assert.deepEqual(parseRemoteUrl('ssh://git@github.com/owner/repo.git'), {
  host: 'github.com',
  owner: 'owner',
  repo: 'repo'
});
assert.deepEqual(parseRemoteUrl('https://token@github.com/owner/repo.git'), {
  host: 'github.com',
  owner: 'owner',
  repo: 'repo'
});
// 自建 GitHub Enterprise：owner 可以有多段
assert.deepEqual(parseRemoteUrl('git@ghe.example.com:org/team/repo.git'), {
  host: 'ghe.example.com',
  owner: 'org/team',
  repo: 'repo'
});
// 解析不出来
assert.equal(parseRemoteUrl(''), undefined);
assert.equal(parseRemoteUrl('   '), undefined);
assert.equal(parseRemoteUrl('not-a-url'), undefined);
assert.equal(parseRemoteUrl('https://github.com/onlyowner'), undefined);

// --- buildBlobUrl ---
const repo = { host: 'github.com', owner: 'owner', repo: 'repo' };
assert.equal(
  buildBlobUrl(repo, 'main', 'src/app.ts'),
  'https://github.com/owner/repo/blob/main/src/app.ts'
);
assert.equal(
  buildBlobUrl(repo, 'main', 'src/app.ts', { start: 10, end: 10 }),
  'https://github.com/owner/repo/blob/main/src/app.ts#L10'
);
assert.equal(
  buildBlobUrl(repo, 'main', 'src/app.ts', { start: 10, end: 20 }),
  'https://github.com/owner/repo/blob/main/src/app.ts#L10-L20'
);
// 分支名带斜杠：按段编码，斜杠保留
assert.equal(
  buildBlobUrl(repo, 'feature/new-thing', 'src/app.ts'),
  'https://github.com/owner/repo/blob/feature/new-thing/src/app.ts'
);
// 路径里的空格要编码
assert.equal(
  buildBlobUrl(repo, 'main', 'my docs/read me.md'),
  'https://github.com/owner/repo/blob/main/my%20docs/read%20me.md'
);
// 提交 SHA
assert.equal(
  buildBlobUrl(repo, 'a1b2c3d', 'src/app.ts'),
  'https://github.com/owner/repo/blob/a1b2c3d/src/app.ts'
);
// 自建域名
assert.equal(
  buildBlobUrl({ host: 'ghe.example.com', owner: 'org/team', repo: 'repo' }, 'main', 'a.ts'),
  'https://ghe.example.com/org/team/repo/blob/main/a.ts'
);

console.log('GitHub 链接纯函数自测通过');
