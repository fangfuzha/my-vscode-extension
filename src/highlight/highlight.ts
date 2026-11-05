import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { logInfo } from '../logger';
import {
  HighlightSettings,
  readHighlightSettings
} from './options';

/** 正则元字符转义，选中的文本按字面量匹配。 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 选中一段文本后，把文档里所有相同的片段一起高亮，
 * 并在小地图与概览标尺上打标记。
 *
 * 思路来自 mde.select-highlight-minimap，
 * 这里做了几处改进：装饰类型会及时释放、选区变化有防抖、
 * 过长或跨行的选区不再对整篇文档做匹配。
 */
export class SelectionHighlighter {
  private decoration: vscode.TextEditorDecorationType | undefined;
  private styleKey = '';
  private timer: NodeJS.Timeout | undefined;
  private settings: HighlightSettings;
  private matchCount = 0;

  constructor(private readonly store: SettingsStore) {
    this.settings = readHighlightSettings(store);
  }

  /** 重新读取设置并立即刷新高亮。 */
  refreshSettings(): void {
    this.settings = readHighlightSettings(this.store);
    this.styleKey = '';
    this.schedule(0);
  }

  /** 清除所有可见编辑器里的高亮。 */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (!this.decoration) {
      return;
    }
    for (const editor of vscode.window.visibleTextEditors) {
      editor.setDecorations(this.decoration, []);
    }
    this.matchCount = 0;
  }

  /** 防抖地重新计算高亮。 */
  schedule(delay = 120): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.apply();
    }, delay);
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.decoration?.dispose();
    this.decoration = undefined;
  }

  private ensureDecoration(): vscode.TextEditorDecorationType {
    const key = `${this.settings.backgroundColor}|${this.settings.overviewRulerColor}`;

    if (!this.decoration || this.styleKey !== key) {
      this.decoration?.dispose();
      this.styleKey = key;
      this.decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: this.settings.backgroundColor,
        overviewRulerColor: this.settings.overviewRulerColor,
        overviewRulerLane: vscode.OverviewRulerLane.Full,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
      });
    }

    return this.decoration;
  }

  private apply(): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !this.settings.enabled) {
      this.clear();
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      this.clear();
      return;
    }

    const selected = editor.document.getText(selection);
    if (!selected) {
      this.clear();
      return;
    }

    const decoration = this.ensureDecoration();
    const ranges = this.collectRanges(editor, selection, selected);

    // 装饰类型是全局的，切换编辑器后旧编辑器里可能还留着上一份高亮
    for (const visible of vscode.window.visibleTextEditors) {
      if (visible !== editor) {
        visible.setDecorations(decoration, []);
      }
    }

    editor.setDecorations(decoration, ranges);

    if (ranges.length !== this.matchCount) {
      this.matchCount = ranges.length;
      logInfo(
        `选区高亮：${ranges.length} 处匹配（${editor.document.fileName}）`
      );
    }
  }

  private collectRanges(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    selected: string
  ): vscode.Range[] {
    const canMatchWholeDocument =
      this.settings.matchWholeDocument &&
      selected.length <= this.settings.maxSelectionLength &&
      !selected.includes('\n') &&
      !selected.includes('\r');

    if (!canMatchWholeDocument) {
      return [selection];
    }

    const text = editor.document.getText();
    const regex = new RegExp(escapeRegExp(selected), 'g');
    const ranges: vscode.Range[] = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      ranges.push(
        new vscode.Range(
          editor.document.positionAt(match.index),
          editor.document.positionAt(match.index + match[0].length)
        )
      );
      if (match.index === regex.lastIndex) {
        regex.lastIndex += 1;
      }
    }

    return ranges;
  }
}
