import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';
import { SECTIONS } from '../config/schema';
import { fetchAllLicenses, getSessionAccount, RateLimitError, signOut } from './api';
import { LicenseItem } from './types';

let panel: vscode.WebviewPanel | undefined;

export interface ManagerDeps {
  store: SettingsStore;
  getToken: (interactive: boolean) => Promise<string | undefined>;
  onSettingsChanged: () => void;
  runAction: (action: string) => Promise<void>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};

  for (const section of SECTIONS) {
    tokens[`section.${section.id}.title`] = section.title;
    if (section.description) {
      tokens[`section.${section.id}.description`] = section.description;
    }

    for (const field of section.fields ?? []) {
      tokens[`field.${field.key}.label`] = field.label;
      if (field.hint) {
        tokens[`field.${field.key}.hint`] = field.hint;
      }
      (field.options ?? []).forEach((option, index) => {
        tokens[`option.${field.key}.${index}`] = option.label ?? option.value;
      });
    }

    for (const action of section.actions ?? []) {
      tokens[`action.${action.id}.label`] = action.label;
    }
  }

  tokens['title'] = vscode.l10n.t('Manager');
  tokens['heading'] = vscode.l10n.t('Manager');
  tokens['button.save.label'] = vscode.l10n.t('Save');
  tokens['button.reset.label'] = vscode.l10n.t('Reset');

  return tokens;
}

function panelStrings() {
  return {
    heading: vscode.l10n.t('Manager'),
    save: vscode.l10n.t('Save'),
    reset: vscode.l10n.t('Reset'),
    noLicense: vscode.l10n.t('No license selected'),
    loading: vscode.l10n.t('Loading licenses...'),
    saved: vscode.l10n.t('Settings saved.'),
    resetDone: vscode.l10n.t('Settings reset.'),
    signedOut: vscode.l10n.t('Not signed in (anonymous API limit: 60 requests/hour)')
  };
}

async function renderHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): Promise<string> {
  const template = await vscode.workspace.fs.readFile(
    vscode.Uri.joinPath(extensionUri, 'media', 'panel.html')
  );
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'panel.css'));
  const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'panel.js'));

  const tokens: Record<string, string> = {
    cspSource: webview.cspSource,
    styleUri: cssUri.toString(),
    scriptUri: jsUri.toString(),
    ...buildTokens()
  };

  return new TextDecoder()
    .decode(template)
    .replace(/\{\{([\w.]+)\}\}/g, (match, key: string) => escapeHtml(tokens[key] ?? ''));
}

async function currentState(deps: ManagerDeps) {
  const account = await getSessionAccount();
  const signedIn = Boolean(await deps.getToken(false));
  return {
    values: deps.store.getAll(),
    authText: signedIn
      ? vscode.l10n.t('Signed in as {0}', account ?? '')
      : vscode.l10n.t('Not signed in (anonymous API limit: 60 requests/hour)')
  };
}

export async function openManagerPanel(
  context: vscode.ExtensionContext,
  deps: ManagerDeps
): Promise<vscode.WebviewPanel> {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Active);
    return panel;
  }

  panel = vscode.window.createWebviewPanel(
    'myVscodeExtension.manager',
    vscode.l10n.t('Manager'),
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
    }
  );

  panel.onDidDispose(() => {
    panel = undefined;
  });

  panel.webview.html = await renderHtml(panel.webview, context.extensionUri);

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.type) {
      case 'ready': {
        const next = await currentState(deps);
        void panel?.webview.postMessage({
          type: 'init',
          values: next.values,
          authText: next.authText,
          strings: panelStrings()
        });
        break;
      }
      case 'save': {
        await deps.store.update(message.values ?? {});
        deps.onSettingsChanged();
        void panel?.webview.postMessage({ type: 'saved', values: deps.store.getAll() });
        break;
      }
      case 'reset': {
        await deps.store.reset();
        deps.onSettingsChanged();
        void panel?.webview.postMessage({ type: 'saved', values: deps.store.getAll(), reset: true });
        break;
      }
      case 'action': {
        await deps.runAction(message.action);
        break;
      }
      default:
        break;
    }
  });

  context.subscriptions.push(panel);
  return panel;
}

export async function loadLicenseOptions(deps: ManagerDeps): Promise<void> {
  try {
    const token = await deps.getToken(false);
    const items: LicenseItem[] = await fetchAllLicenses(token);
    void panel?.webview.postMessage({
      type: 'licenses',
      items: items.map((item) => ({
        key: item.key,
        spdxId: item.spdx_id ?? item.key,
        name: item.name
      }))
    });
  } catch (error) {
    const text =
      error instanceof RateLimitError
        ? error.resetAt
          ? vscode.l10n.t('GitHub API rate limit reached. Try again after {0}.', error.resetAt.toLocaleString())
          : vscode.l10n.t('GitHub API rate limit reached. Sign in to GitHub and try again.')
        : vscode.l10n.t('Failed to fetch licenses: {0}', (error as Error).message);
    void panel?.webview.postMessage({ type: 'error', message: text });
  }
}

export async function refreshAuthState(deps: ManagerDeps): Promise<void> {
  const account = await getSessionAccount();
  const signedIn = Boolean(await deps.getToken(false));
  void panel?.webview.postMessage({
    type: 'auth',
    signedIn,
    account,
    text: signedIn
      ? vscode.l10n.t('Signed in as {0}', account ?? '')
      : vscode.l10n.t('Not signed in (anonymous API limit: 60 requests/hour)')
  });
}

export async function signOutSession(): Promise<void> {
  await signOut();
}
