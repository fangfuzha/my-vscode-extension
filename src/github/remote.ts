/**
 * Git remote 解析与 GitHub URL 构造。
 *
 * 这一层是纯函数：不碰文件系统、不跑 git 命令，便于单测。
 */

export interface GitHubRepo {
  /** 仓库主机名，例如 github.com 或自建 GitHub Enterprise 的域名。 */
  host: string;
  /** 仓库拥有者，GitHub Enterprise 允许多段（org/team）。 */
  owner: string;
  /** 仓库名，不含 .git 后缀。 */
  repo: string;
}

export interface LineRange {
  /** 起始行，1 基。 */
  start: number;
  /** 结束行，1 基。 */
  end: number;
}

/** ssh://git@host/owner/repo.git 与 https://host/owner/repo.git 这类带协议的写法。 */
const URL_LIKE = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]*@)?([^/:]+)\/(.+)$/i;

/** git@host:owner/repo.git 这种 scp 风格的写法。 */
const SCP_LIKE = /^(?:[^@/]+@)?([^:/]+):(.+)$/;

/**
 * 解析 git remote URL，取出 host / owner / repo。
 *
 * 支持：
 * - git@github.com:owner/repo.git
 * - ssh://git@github.com/owner/repo.git
 * - https://github.com/owner/repo.git
 * - https://token@github.com/owner/repo.git
 *
 * 解析不出来时返回 undefined，由调用方给出提示。
 */
export function parseRemoteUrl(remoteUrl: string): GitHubRepo | undefined {
  const url = remoteUrl.trim();
  if (!url) {
    return undefined;
  }

  let host: string;
  let path: string;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    const matched = URL_LIKE.exec(url);
    if (!matched) {
      return undefined;
    }
    host = matched[1];
    path = matched[2];
  } else {
    const matched = SCP_LIKE.exec(url);
    if (!matched) {
      return undefined;
    }
    host = matched[1];
    path = matched[2];
  }

  const cleaned = path.replace(/\.git$/i, '').replace(/^\/+/, '');
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.length < 2) {
    return undefined;
  }

  const repo = segments[segments.length - 1];
  const owner = segments.slice(0, -1).join('/');
  if (!owner || !repo) {
    return undefined;
  }

  return { host, owner, repo };
}

/** 按路径段编码，保留分隔符。 */
function encodePathSegments(value: string): string {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * 构造文件在 GitHub 上的浏览地址。
 *
 * ref 用分支名或提交 SHA；分支名里可能带斜杠，所以按段编码而不是整体编码。
 */
export function buildBlobUrl(
  repo: GitHubRepo,
  ref: string,
  relativePath: string,
  lineRange?: LineRange
): string {
  const owner = encodePathSegments(repo.owner);
  const name = encodeURIComponent(repo.repo);
  const path = encodePathSegments(relativePath);
  const encodedRef = encodePathSegments(ref);

  let url =
    'https://' + repo.host + '/' + owner + '/' + name + '/blob/' + encodedRef + '/' + path;

  if (lineRange) {
    url +=
      lineRange.start === lineRange.end
        ? '#L' + lineRange.start
        : '#L' + lineRange.start + '-L' + lineRange.end;
  }

  return url;
}
