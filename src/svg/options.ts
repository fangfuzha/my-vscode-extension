import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { CAMEL_CASE_LANGUAGES } from './consts';
import { SvgPreviewOptions } from './extract';
import { SvgSettings } from './types';


/** 从全局配置里读出 SVG 模块的全部设置。 */
export function readSvgSettings(store: SettingsStore): SvgSettings {
  const precision = Number.parseInt(store.get<string>('svg.floatPrecision'), 10);

  return {
    enableHover: store.get<boolean>('svg.enableHover'),
    showGutterPreview: store.get<boolean>('svg.showGutterPreview'),
    removeClasses: store.get<boolean>('svg.removeClasses'),
    removeComments: store.get<boolean>('svg.removeComments'),
    removeDoctype: store.get<boolean>('svg.removeDoctype'),
    cleanupIds: store.get<boolean>('svg.cleanupIds'),
    floatPrecision: Number.isFinite(precision) ? Math.min(Math.max(precision, 0), 10) : 3,
    multipass: store.get<boolean>('svg.multipass'),
    removeViewBox: store.get<boolean>('svg.removeViewBox'),
    removeDimensions: store.get<boolean>('svg.removeDimensions'),
    prefixIds: store.get<boolean>('svg.prefixIds'),
    mergePaths: store.get<boolean>('svg.mergePaths'),
    convertShapeToPath: store.get<boolean>('svg.convertShapeToPath'),
    collapseGroups: store.get<boolean>('svg.collapseGroups')
  };
}

/**
 * 构造预览用的选项：React 系语言用 camelCase 属性，
 * 深色主题用白色做对比色，否则用黑色。
 */
export function buildPreviewOptions(
  store: SettingsStore,
  languageId: string,
  minSize: number
): SvgPreviewOptions {
  const kind = vscode.window.activeColorTheme.kind;
  const isDark =
    kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;

  return {
    useCamelCase: CAMEL_CASE_LANGUAGES.includes(languageId),
    contrastColor: isDark ? '#ffffff' : '#000000',
    minSize
  };
}
