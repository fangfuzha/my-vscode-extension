/**
 * 选区高亮模块入口：把「选中即高亮所有相同文本」接到扩展宿主上。
 */
import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { logInfo } from '../logger';
import { SelectionHighlighter } from './highlight';

export interface HighlightModule {
  /** 重新读取设置并刷新高亮。 */
  refresh: () => void;
  /** 清除当前高亮。 */
  clear: () => void;
}

export function registerHighlightModule(
  context: vscode.ExtensionContext,
  store: SettingsStore
): HighlightModule {
  const highlighter = new SelectionHighlighter(store);

  context.subscriptions.push(
    { dispose: () => highlighter.dispose() },
    vscode.window.onDidChangeTextEditorSelection(() => {
      highlighter.schedule();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      highlighter.clear();
      highlighter.schedule(0);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document !== vscode.window.activeTextEditor?.document) {
        return;
      }
      highlighter.schedule(200);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('my-vscode-extension.highlight.clear', () => {
      highlighter.clear();
      logInfo('已手动清除选区高亮');
    })
  );

  highlighter.schedule(0);

  return {
    refresh: () => highlighter.refreshSettings(),
    clear: () => highlighter.clear()
  };
}
