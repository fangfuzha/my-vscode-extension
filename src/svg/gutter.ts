/**
 * 行号槽里的 SVG 缩略图。
 */
import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { logInfo } from '../logger';
import { collectSvgPreviewCandidates, svgToDataUri } from './extract';
import { buildPreviewOptions } from './options';

export class SvgGutterPreview {
  private readonly decorationTypes = new Map<string, vscode.TextEditorDecorationType[]>();

  constructor(private readonly store: SettingsStore) {}

  public updateDecorations(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      return;
    }

    const docUri = editor.document.uri.toString();
    this.disposeDecorationsForUri(docUri);

    if (!this.store.get<boolean>('svg.showGutterPreview')) {
      return;
    }

    const text = editor.document.getText();
    const candidates = collectSvgPreviewCandidates(
      text,
      buildPreviewOptions(this.store, editor.document.languageId, 16)
    );

    logInfo(
      `行号槽扫描：${editor.document.fileName}，命中 ${candidates.length} 个 SVG`
    );

    const created: vscode.TextEditorDecorationType[] = [];
    for (const candidate of candidates) {
      const startPos = editor.document.positionAt(candidate.startIndex);
      // 零长度区间，保证每个 SVG 只显示一个行号槽图标。
      const range = new vscode.Range(startPos, startPos);
      const decorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.parse(svgToDataUri(candidate.previewSvg)),
        gutterIconSize: 'contain'
      });
      created.push(decorationType);
      editor.setDecorations(decorationType, [{ range }]);
    }

    this.decorationTypes.set(docUri, created);
  }

  private disposeDecorationsForUri(uri: string): void {
    const types = this.decorationTypes.get(uri);
    if (types) {
      types.forEach((type) => type.dispose());
      this.decorationTypes.delete(uri);
    }
  }

  public dispose(): void {
    this.decorationTypes.forEach((types) => types.forEach((type) => type.dispose()));
    this.decorationTypes.clear();
  }
}
