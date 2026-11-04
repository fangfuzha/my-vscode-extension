import * as vscode from 'vscode';

import { License, LicenseItem } from './types';

const API_BASE = 'https://api.github.com/licenses';
const USER_AGENT = 'my-vscode-extension';

/** GitHub 匿名 API 配额耗尽（60 次/小时/IP）。 */
export class RateLimitError extends Error {
  constructor(public readonly resetAt?: Date) {
    super(vscode.l10n.t('GitHub API rate limit reached.'));
    this.name = 'RateLimitError';
  }
}

async function request<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');

    // 实测：GitHub 的 403 有时不带限流响应头（边缘/WAF 直接拦截），
    // 此时 remaining 为 null，同样按限流处理，否则用户只会看到 403 原始错误。
    if (response.status === 429 || remaining === '0' || remaining === null) {
      throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : undefined);
    }
  }

  if (!response.ok) {
    throw new Error(
      vscode.l10n.t('GitHub API request failed: {0} {1}', response.status, response.statusText)
    );
  }

  return (await response.json()) as T;
}

export function fetchLicenses(token?: string): Promise<LicenseItem[]> {
  return request<LicenseItem[]>(API_BASE, token);
}

export function fetchLicense(key: string, token?: string): Promise<License> {
  return request<License>(`${API_BASE}/${key}`, token);
}

/**
 * 静默获取已登录 GitHub 会话的令牌；未登录返回 undefined（走匿名配额）。
 */
export async function getSessionToken(interactive: boolean): Promise<string | undefined> {
  try {
    const session = interactive
      ? await vscode.authentication.getSession('github', [], {
          createIfNone: true,
          detail: vscode.l10n.t('Sign in to GitHub to raise the API rate limit.')
        } as vscode.AuthenticationGetSessionOptions & { createIfNone: true })
      : await vscode.authentication.getSession('github', [], { createIfNone: false });
    return session?.accessToken;
  } catch {
    return undefined;
  }
}

export async function getSessionAccount(): Promise<string | undefined> {
  try {
    const accounts = await vscode.authentication.getAccounts('github');
    return accounts[0]?.label;
  } catch {
    return undefined;
  }
}

export async function signOut(): Promise<void> {
  try {
    await vscode.authentication.getSession('github', [], {
      createIfNone: false,
      clearSessionPreference: true
    });
  } catch {
    // 未登录时忽略
  }
}
