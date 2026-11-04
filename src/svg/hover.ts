/**
 * SVG 悬停预览。
 */
import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { logInfo } from '../logger';
import { findSvgPreviewAtOffset, svgToDataUri } from './extract';
import { buildPreviewOptions } from './options';
import { formatBytes, getSvgDimensions, SvgDimensions } from './utils';

interface HoverCommandArgs {
  uri: string;
  start: number;
  length: number;
}

interface SvgCacheEntry {
  dataUri: string;
  sizeBytes: number;
  timestamp: number;
}

const CACHE_MAX_AGE = 5_000;

export class SvgHoverProvider implements vscode.HoverProvider {
  private readonly cache = new Map<string, SvgCacheEntry>();

  constructor(private readonly store: SettingsStore) {}

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | null {
    if (!this.store.get<boolean>('svg.enableHover')) {
      return null;
    }

    const text = document.getText();
    const offset = document.offsetAt(position);
    const candidate = findSvgPreviewAtOffset(
      text,
      offset,
      buildPreviewOptions(this.store, document.languageId, 128)
    );

    if (!candidate) {
      return null;
    }

    const startPos = document.positionAt(candidate.startIndex);
    const endPos = document.positionAt(candidate.startIndex + candidate.length);
    const range = new vscode.Range(startPos, endPos);
    const sizeBytes = Buffer.byteLength(candidate.source, 'utf8');
    const dimensions = getSvgDimensions(candidate.source);
    const cacheKey = `${document.uri.toString()}:${candidate.kind}:${candidate.startIndex}:${candidate.length}:${candidate.previewSvg.length}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // 只有完整 SVG 才能就地优化，symbol / use 片段不提供优化入口。
    const commandArgs =
      candidate.kind === 'svg' ? this.buildCommandArgs(document, range) : null;

    if (cached && now - cached.timestamp < CACHE_MAX_AGE) {
      return this.createHover(cached.dataUri, cached.sizeBytes, dimensions, range, commandArgs);
    }

    const dataUri = svgToDataUri(candidate.previewSvg);
    logInfo(
      `悬停命中：${document.fileName} ${candidate.kind}，原始 ${sizeBytes} 字节` +
        (dimensions.width !== null && dimensions.height !== null
          ? `，尺寸 ${dimensions.width}×${dimensions.height}`
          : '')
    );
    this.cache.set(cacheKey, { dataUri, sizeBytes, timestamp: now });
    return this.createHover(dataUri, sizeBytes, dimensions, range, commandArgs);
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private createHover(
    dataUri: string,
    sizeBytes: number,
    dimensions: SvgDimensions,
    range: vscode.Range,
    commandArgs: HoverCommandArgs | null
  ): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;
    markdown.appendMarkdown(`![SVG Preview](${dataUri})\n\n`);
    markdown.appendMarkdown(
      `**${vscode.l10n.t('Size')}:** ${formatBytes(sizeBytes)}\n\n`
    );

    if (dimensions.width !== null && dimensions.height !== null) {
      markdown.appendMarkdown(
        `**${vscode.l10n.t('Dimensions')}:** ${dimensions.width} × ${dimensions.height}\n\n`
      );
    }

    if (commandArgs) {
      const encoded = encodeURIComponent(JSON.stringify(commandArgs));
      markdown.appendMarkdown(
        `[${vscode.l10n.t('Optimize SVG')}](command:my-vscode-extension.svg.optimizeFromHover?${encoded})`
      );
    }

    return new vscode.Hover(markdown, range);
  }

  private buildCommandArgs(
    document: vscode.TextDocument,
    range: vscode.Range
  ): HoverCommandArgs {
    const start = document.offsetAt(range.start);
    const end = document.offsetAt(range.end);
    return {
      uri: document.uri.toString(),
      start,
      length: end - start
    };
  }
}

