import * as vscode from 'vscode';

import { SettingsStore } from './config/store';
import { registerContext7Mcp } from './context7/mcp';
import { getSessionToken } from './license/api';
import { addDefaultLicense, addLicense } from './license/commands';
import {
  loadLicenseOptions,
  openManagerPanel,
  refreshAuthState,
  signOutSession
} from './panel/panel';

export function activate(context: vscode.ExtensionContext): void {
  const store = new SettingsStore(context);
  // 一次性声明参与 Settings Sync 的全部 key。
  store.init();

  const context7Mcp = registerContext7Mcp(context, store);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.command = 'my-vscode-extension.openManager';
  context.subscriptions.push(status);

  const updateStatus = () => {
    const settings = store.getLicense();
    status.text = `$(law) ${settings.defaultKey || vscode.l10n.t('License')}`;
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
    )
  );
}

export function deactivate(): void {
  // Nothing to clean up yet.
}
