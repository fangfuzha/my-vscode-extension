/**
 * SVG 模块入口：把悬停预览、行号槽图标与 SVG 编辑器操作接到扩展宿主上。
 */
import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { logError, logInfo, logWarn } from '../logger';
import { SUPPORTED_LANGUAGES } from './consts';
import { SvgGutterPreview } from './gutter';
import { SvgHoverProvider } from './hover';
import { optimizeSvgDocument, optimizeSvgInline } from './optimize';
import { readSvgSettings } from './options';

export interface SvgModule {
  /** 重新读取设置并刷新相关状态。 */
  refresh: () => void;
}

export function registerSvgModule(
  context: vscode.ExtensionContext,
  store: SettingsStore
): SvgModule {
  let settings = readSvgSettings(store);
  logInfo(`SVG 模块已注册，当前设置：${JSON.stringify(settings)}`);

  const gutterPreview = new SvgGutterPreview(store);
  const hoverProvider = new SvgHoverProvider(store);

  // 运行时自检：确认宿主加载到的清单里确实有 SVG 相关的命令贡献点。
  // 清单改动需要重启扩展宿主才会生效，这行日志能直接看出当前跑的是不是旧清单。
  const manifest = context.extension.packageJSON as {
    contributes?: { commands?: Array<{ command?: string }> };
  };
  const svgCommands = (manifest.contributes?.commands ?? [])
    .map((item) => item.command ?? '')
    .filter((command) => command.startsWith('my-vscode-extension.svg'));
  logInfo(`清单中的 SVG 命令：${svgCommands.join(', ') || '(无)'}`);
  if (svgCommands.length === 0) {
    logWarn('清单里没有 SVG 命令，请确认扩展已重新打包并重启了扩展宿主');
  }

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      SUPPORTED_LANGUAGES.map((language) => ({ language, scheme: 'file' })),
      hoverProvider
    ),
    { dispose: () => gutterPreview.dispose() }
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      gutterPreview.updateDecorations(editor);
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      gutterPreview.updateDecorations(vscode.window.activeTextEditor);
    }),
    vscode.commands.registerCommand(
      'my-vscode-extension.svg.optimize',
      async (uri?: vscode.Uri) => {
        let document: vscode.TextDocument | undefined;

        if (uri instanceof vscode.Uri) {
          try {
            document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
          } catch (error) {
            logError('打开待优化的文档失败', error);
            void vscode.window.showErrorMessage(
              vscode.l10n.t('Failed to open document: {0}', (error as Error).message)
            );
            return;
          }
        } else {
          document = vscode.window.activeTextEditor?.document;
        }

        if (!document) {
          void vscode.window.showErrorMessage(
            vscode.l10n.t('No active editor or file selected')
          );
          return;
        }

        if (!document.fileName.toLowerCase().endsWith('.svg')) {
          void vscode.window.showErrorMessage(vscode.l10n.t('Not an SVG file'));
          return;
        }

        logInfo(`开始优化独立 SVG：${document.fileName}`);
        await optimizeSvgDocument(document, settings);
      }
    ),

    vscode.commands.registerCommand(
      'my-vscode-extension.svg.optimizeFromHover',
      async (args?: { uri: string; start: number; length: number }) => {
        if (!args?.uri) {
          void vscode.window.showErrorMessage(
            vscode.l10n.t('No SVG metadata provided')
          );
          return;
        }

        try {
          const document = await vscode.workspace.openTextDocument(
            vscode.Uri.parse(args.uri)
          );
          await vscode.window.showTextDocument(document);

          const start = args.start ?? 0;
          const length = args.length ?? 0;
          if (length <= 0) {
            void vscode.window.showErrorMessage(
              vscode.l10n.t('Invalid SVG bounds')
            );
            return;
          }

          const range = new vscode.Range(
            document.positionAt(start),
            document.positionAt(start + length)
          );
          logInfo(
            `开始优化内联 SVG：${document.fileName} @ ${start}（长度 ${length}）`
          );
          await optimizeSvgInline(document, document.getText(range), range, settings);
        } catch (error) {
          logError('从悬停优化失败', error);
          void vscode.window.showErrorMessage(
            vscode.l10n.t(
              'No SVG found at cursor position ({0})',
              (error as Error).message
            )
          );
        }
      }
    )
  );

  // 文档改动后刷新行号槽图标（防抖）。
  let timeout: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document !== event.document) {
        return;
      }

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        gutterPreview.updateDecorations(editor);
      }, 500);
    })
  );

  setTimeout(() => {
    gutterPreview.updateDecorations(vscode.window.activeTextEditor);
  }, 100);

  const refresh = (): void => {
    settings = readSvgSettings(store);
    logInfo(`重新读取 SVG 设置：${JSON.stringify(settings)}`);
    gutterPreview.updateDecorations(vscode.window.activeTextEditor);
    hoverProvider.clearCache();
  };

  return { refresh };
}
