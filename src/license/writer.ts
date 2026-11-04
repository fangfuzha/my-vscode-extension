import * as vscode from 'vscode';

import { CONVENTIONAL_FILENAMES } from './templates';
import { LicenseSettings } from '../config/store';

export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * 目标目录：优先用当前编辑器所在的工作区目录，其次单根工作区，最后才让用户选。
 */
export async function resolveTargetFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }

  const active = vscode.window.activeTextEditor?.document.uri;
  if (active) {
    const matched = folders.find((folder) => active.fsPath.startsWith(folder.uri.fsPath));
    if (matched) {
      return matched;
    }
  }

  if (folders.length === 1) {
    return folders[0];
  }

  return vscode.window.showWorkspaceFolderPick();
}

export function resolveFilename(settings: LicenseSettings, licenseKey: string): string {
  if (settings.useConventionalFilename) {
    const conventional = CONVENTIONAL_FILENAMES[licenseKey];
    if (conventional) {
      return conventional;
    }
  }
  return settings.filename.trim() || 'LICENSE';
}

export function resolveFileName(
  settings: LicenseSettings,
  licenseKey: string,
  spdxId: string | null,
  multiple: boolean
): string {
  const base = resolveFilename(settings, licenseKey);
  const suffix = multiple && spdxId ? `-${spdxId}` : '';
  return `${base}${suffix}${settings.extension}`;
}

/** 写入许可证文件；已存在时先模态确认。 */
export async function writeLicenseFile(
  target: vscode.Uri,
  content: string,
  displayName: string
): Promise<boolean> {
  if (await fileExists(target)) {
    const overwrite = vscode.l10n.t('Overwrite');
    const answer = await vscode.window.showWarningMessage(
      vscode.l10n.t('{0} already exists. Overwrite it?', displayName),
      { modal: true },
      overwrite
    );
    if (answer !== overwrite) {
      return false;
    }
  }

  await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(content));
  return true;
}
