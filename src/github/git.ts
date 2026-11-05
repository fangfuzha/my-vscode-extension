/**
 * 读取 git 仓库信息：仓库根目录、当前分支、HEAD 提交与 remote 地址。
 *
 * 统一走 git 命令行，不自己解析 .git 目录，worktree / submodule 都能正确处理。
 */
import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const exec = promisify(execFile);

/** 禁止 git 弹凭证提示，否则在无凭据环境下会挂住扩展宿主。 */
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec('git', ['-C', cwd, ...args], { env: GIT_ENV });
  return stdout.trim();
}

/** 执行 git 命令，失败时返回 undefined 而不是抛错。 */
async function gitOptional(cwd: string, args: string[]): Promise<string | undefined> {
  try {
    const out = await git(cwd, args);
    return out || undefined;
  } catch {
    return undefined;
  }
}

/** 找出文件所属的仓库根目录，不在仓库里返回 undefined。 */
export async function findRepositoryRoot(filePath: string): Promise<string | undefined> {
  const folder = path.dirname(filePath);
  const root = await gitOptional(folder, ['rev-parse', '--show-toplevel']);
  return root ? path.normalize(root) : undefined;
}

/**
 * 当前分支名。处于 detached HEAD 时返回 HEAD，
 * 调用方据此改用提交 SHA。
 */
export async function getCurrentBranch(repoRoot: string): Promise<string | undefined> {
  return gitOptional(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

/** 当前 HEAD 的提交 SHA。 */
export async function getHeadCommit(repoRoot: string): Promise<string | undefined> {
  return gitOptional(repoRoot, ['rev-parse', 'HEAD']);
}

/**
 * 取 remote 地址。
 *
 * 优先用当前分支配置的 remote，没有就用 origin，再没有就用列表里的第一个。
 */
export async function getRemoteUrl(
  repoRoot: string,
  branch?: string
): Promise<string | undefined> {
  if (branch && branch !== 'HEAD') {
    const branchRemote = await gitOptional(repoRoot, [
      'config',
      '--get',
      'branch.' + branch + '.remote'
    ]);
    if (branchRemote && branchRemote !== '.') {
      const url = await gitOptional(repoRoot, [
        'config',
        '--get',
        'remote.' + branchRemote + '.url'
      ]);
      if (url) {
        return url;
      }
    }
  }

  const origin = await gitOptional(repoRoot, ['config', '--get', 'remote.origin.url']);
  if (origin) {
    return origin;
  }

  const remotes = await gitOptional(repoRoot, ['remote']);
  const first = remotes?.split(/\r?\n/).filter(Boolean)[0];
  if (!first) {
    return undefined;
  }
  return gitOptional(repoRoot, ['config', '--get', 'remote.' + first + '.url']);
}

/** 文件相对仓库根目录的路径，统一用正斜杠。 */
export function toRepoRelativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

/** 文件的 git 状态：未跟踪、有本地改动，还是干净。 */
export type FileStatus = 'clean' | 'modified' | 'untracked';

export async function getFileStatus(
  repoRoot: string,
  relativePath: string
): Promise<FileStatus> {
  const out = await gitOptional(repoRoot, ['status', '--porcelain', '--', relativePath]);
  if (!out) {
    return 'clean';
  }
  const code = out.slice(0, 2);
  if (code === '??') {
    return 'untracked';
  }
  return 'modified';
}
