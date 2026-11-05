/**
 * 「在 GitHub 打开」模块：把当前文件（或选区）定位到 GitHub 上的对应位置。
 *
 * 自己实现，不依赖任何第三方扩展：
 * - 仓库根目录、分支、remote 地址都从 git 命令行读取
 * - remote URL 解析与 URL 构造在 remote.ts 里，是可单测的纯函数
 */
import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { logError, logInfo } from '../logger';
import {
  findRepositoryRoot,
  getCurrentBranch,
  getFileStatus,
  getHeadCommit,
  getRemoteUrl,
  toRepoRelativePath
} from './git';
import { buildBlobUrl, LineRange, parseRemoteUrl } from './remote';

export interface GitHubModule {
  /** 重新读取设置。 */
  refresh: () => void;
}

interface ResolvedTarget {
  url: string;
  repoName: string;
  branch: string;
  relativePath: string;
  status: 'clean' | 'modified' | 'untracked';
}

/** 从当前编辑器取选区行号（1 基）；没有选区时取光标所在行。 */
function resolveLineRange(editor: vscode.TextEditor): LineRange {
  const start = editor.selection.start.line + 1;
  const end = editor.selection.end.line + 1;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

async function resolveTarget(
  editor: vscode.TextEditor,
  store: SettingsStore
): Promise<ResolvedTarget | undefined> {
  const filePath = editor.document.uri.fsPath;

  const repoRoot = await findRepositoryRoot(filePath);
  if (!repoRoot) {
    void vscode.window.showErrorMessage(
      vscode.l10n.t('The current file is not in a Git repository.')
    );
    return undefined;
  }

  const branch = await getCurrentBranch(repoRoot);
  const remoteUrl = await getRemoteUrl(repoRoot, branch);
  if (!remoteUrl) {
    void vscode.window.showErrorMessage(
      vscode.l10n.t('No Git remote is configured for this repository.')
    );
    return undefined;
  }

  const repo = parseRemoteUrl(remoteUrl);
  if (!repo) {
    void vscode.window.showErrorMessage(
      vscode.l10n.t('Could not understand the Git remote URL: {0}', remoteUrl)
    );
    return undefined;
  }

  // 分支名带斜杠时 GitHub 无法直接解析，这里统一改用提交 SHA。
  const useCommit = store.get<boolean>('github.useCommitSha');
  const head = await getHeadCommit(repoRoot);
  let ref: string;
  if (useCommit || !branch || branch === 'HEAD') {
    if (!head) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t('This repository has no commit yet.')
      );
      return undefined;
    }
    ref = head;
  } else if (branch.includes('/')) {
    if (!head) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t('This repository has no commit yet.')
      );
      return undefined;
    }
    ref = head;
  } else {
    ref = branch;
  }

  const relativePath = toRepoRelativePath(repoRoot, filePath);
  const status = await getFileStatus(repoRoot, relativePath);
  const lineRange = resolveLineRange(editor);
  const url = buildBlobUrl(repo, ref, relativePath, lineRange);

  return {
    url,
    repoName: repo.owner + '/' + repo.repo,
    branch: ref,
    relativePath,
    status
  };
}

export function registerGitHubModule(
  context: vscode.ExtensionContext,
  store: SettingsStore
): GitHubModule {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'my-vscode-extension.github.openInGitHub',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.scheme !== 'file') {
          void vscode.window.showErrorMessage(
            vscode.l10n.t('No active editor or file selected')
          );
          return;
        }

        try {
          const target = await resolveTarget(editor, store);
          if (!target) {
            return;
          }

          logInfo(
            '在 GitHub 打开：' +
              target.url +
              '（仓库 ' +
              target.repoName +
              '，引用 ' +
              target.branch +
              '，状态 ' +
              target.status +
              '）'
          );

          await vscode.env.openExternal(vscode.Uri.parse(target.url));

          if (target.status !== 'clean') {
            void vscode.window.showWarningMessage(
              vscode.l10n.t(
                'The link points to the last commit. Local changes are not visible online.'
              )
            );
          }
        } catch (error) {
          logError('在 GitHub 打开失败', error);
          void vscode.window.showErrorMessage(
            vscode.l10n.t('Failed to open the GitHub link: {0}', (error as Error).message)
          );
        }
      }
    )
  );

  return {
    refresh: () => {
      logInfo('重新读取 GitHub 链接设置');
    }
  };
}
