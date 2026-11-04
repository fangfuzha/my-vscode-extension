import * as vscode from 'vscode';

import { optimize } from 'svgo/browser';

import { logError, logInfo } from '../logger';
import { CAMEL_CASE_LANGUAGES } from './consts';
import { getSvgoPlugins, SvgoOptions } from './svgoPlugins';
import {
  finalizeAfterOptimization,
  matchAttributeQuoteStyle,
  prepareForOptimization
} from './transform';
import { SvgSettings } from './types';
import { calculateSavings } from './utils';

/** 把扩展设置转换成 SVGO 选项，允许调用方覆盖个别值。 */
export function toSvgoOptions(
  settings: SvgSettings,
  overrides: Partial<SvgoOptions> = {}
): SvgoOptions {
  return {
    removeClasses: settings.removeClasses,
    removeComments: settings.removeComments,
    removeDoctype: settings.removeDoctype,
    cleanupIds: settings.cleanupIds,
    floatPrecision: settings.floatPrecision,
    multipass: settings.multipass,
    removeViewBox: settings.removeViewBox,
    removeDimensions: settings.removeDimensions,
    prefixIds: settings.prefixIds,
    mergePaths: settings.mergePaths,
    convertShapeToPath: settings.convertShapeToPath,
    collapseGroups: settings.collapseGroups,
    ...overrides
  };
}

/** 优化一个独立的 .svg 文件并覆盖写回。 */
export async function optimizeSvgDocument(
  document: vscode.TextDocument,
  settings: SvgSettings
): Promise<void> {
  const original = document.getText();

  try {
    const options = toSvgoOptions(settings);
    const result = optimize(original, {
      multipass: options.multipass,
      floatPrecision: options.floatPrecision,
      plugins: getSvgoPlugins(options)
    });

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(document.positionAt(0), document.positionAt(original.length)),
      result.data
    );
    await vscode.workspace.applyEdit(edit);

    const savings = calculateSavings(original, result.data);
    logInfo(
      `优化完成：${document.fileName}，${savings.originalSizeFormatted} → ${savings.optimizedSizeFormatted}（省 ${savings.savingPercent}%）`
    );
    void vscode.window.showInformationMessage(
      vscode.l10n.t(
        'SVG optimized. Reduced from {0} to {1} ({2}% saved).',
        savings.originalSizeFormatted,
        savings.optimizedSizeFormatted,
        savings.savingPercent
      )
    );
  } catch (error) {
    logError('优化独立 SVG 失败', error);
    void vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to optimize SVG: {0}', (error as Error).message)
    );
  }
}

/**
 * 优化源码里的一段内联 SVG。
 * 内联场景强制保留 class 与框架专有属性，避免破坏 v-if / on:click / className。
 */
export async function optimizeSvgInline(
  document: vscode.TextDocument,
  svgContent: string,
  range: vscode.Range,
  settings: SvgSettings
): Promise<void> {
  try {
    const options = toSvgoOptions(settings, { removeClasses: false });
    const transformOptions = {
      useCamelCase: CAMEL_CASE_LANGUAGES.includes(document.languageId)
    };

    const { preparedSvg, wasJsx } = prepareForOptimization(svgContent, transformOptions);
    const result = optimize(preparedSvg, {
      multipass: options.multipass,
      floatPrecision: options.floatPrecision,
      plugins: getSvgoPlugins(options)
    });

    let finalSvg = finalizeAfterOptimization(result.data, wasJsx, transformOptions);
    // 保留作者原本的引号风格，避免破坏外层字符串字面量。
    finalSvg = matchAttributeQuoteStyle(finalSvg, svgContent);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, finalSvg);
    await vscode.workspace.applyEdit(edit);

    const savings = calculateSavings(svgContent, finalSvg);
    logInfo(
      `优化完成（内联）：${document.fileName}，${savings.originalSizeFormatted} → ${savings.optimizedSizeFormatted}（省 ${savings.savingPercent}%）`
    );
    void vscode.window.showInformationMessage(
      vscode.l10n.t(
        'SVG optimized. Reduced from {0} to {1} ({2}% saved).',
        savings.originalSizeFormatted,
        savings.optimizedSizeFormatted,
        savings.savingPercent
      )
    );
  } catch (error) {
    logError('优化内联 SVG 失败', error);
    void vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to optimize SVG: {0}', (error as Error).message)
    );
  }
}
