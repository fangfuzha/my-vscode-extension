import * as vscode from 'vscode';

import { SettingsStore } from './config/store';
import { initLogger, logError, logInfo, showLog } from './logger';
import { registerContext7Mcp } from './context7/mcp';
import { registerDeepWikiMcp } from './deepwiki/mcp';
import { getSessionToken } from './license/api';
import { addDefaultLicense, addLicense } from './license/commands';
import {
  loadLicenseOptions,
  openManagerPanel,
  refreshAuthState,
  signOutSession
} from './panel/panel';
import { registerSvgModule } from './svg';
import { registerHighlightModule } from './highlight';

export function activate(context: vscode.ExtensionContext): void {
  initLogger(context);
  logInfo('扩展已激活，开始注册功能');

  try {
    activateFeatures(context);
  } catch (error) {
    logError('扩展激活失败', error);
    throw error;
  }
}

function activateFeatures(context: vscode.ExtensionContext): void {
  const store = new SettingsStore(context);
  // 一次性声明参与 Settings Sync 的全部 key。
  store.init();

  const context7Mcp = registerContext7Mcp(context, store);
  const deepWikiMcp = registerDeepWikiMcp(context, store);
  const svgModule = registerSvgModule(context, store);
  const highlightModule = registerHighlightModule(context, store);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.command = 'my-vscode-extension.openManager';
  context.subscriptions.push(status);

  const updateStatus = () => {
    status.text = '$(law)';
    status.tooltip = vscode.l10n.t('Open Manager');
    status.show();
  };

  updateStatus();
  void context7Mcp.refresh();

  const deps = {
    store,
    getToken: getSessionToken,
    onSettingsChanged: updateStatus,
    runAction: async (action: string): Promise<void> => {
      switch (action) {
        case 'loadLicenses':
          await loadLicenseOptions(deps);
          break;
        case 'addLicense':
          await addLicense(deps, false);
          break;
        case 'addMultipleLicenses':
          await addLicense(deps, true);
          break;
        case 'addDefaultLicense':
          await addDefaultLicense(deps);
          break;
        case 'signIn':
          await getSessionToken(true);
          await refreshAuthState(deps);
          break;
        case 'signOut':
          await signOutSession();
          await refreshAuthState(deps);
          break;
        case 'refreshContext7':
          await context7Mcp.refresh();
          break;
        case 'refreshDeepWiki':
          await deepWikiMcp.refresh();
          break;
        case 'refreshSvg':
          svgModule.refresh();
          break;
        case 'refreshHighlight':
          highlightModule.refresh();
          break;
        case 'clearHighlight':
          highlightModule.clear();
          break;

        case 'openDeepWikiApiKeys':
          await vscode.env.openExternal(
            vscode.Uri.parse('https://app.devin.ai/settings/api-keys')
          );
          break;
        default:
          break;
      }
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('my-vscode-extension.openManager', () =>
      openManagerPanel(context, deps)
    ),
    vscode.commands.registerCommand('my-vscode-extension.license.add', () =>
      addLicense(deps, false)
    ),
    vscode.commands.registerCommand('my-vscode-extension.license.addMultiple', () =>
      addLicense(deps, true)
    ),
    vscode.commands.registerCommand('my-vscode-extension.license.addDefault', () =>
      addDefaultLicense(deps)
    ),
    vscode.commands.registerCommand('my-vscode-extension.showLog', () => {
      showLog();
    })
  );

  logInfo('扩展功能注册完成');
}

export function deactivate(): void {
  // Nothing to clean up yet.
}
