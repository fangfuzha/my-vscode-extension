import * as vscode from 'vscode';

import { Context7AuthMode, SettingsStore } from '../config/store';

type KeyCheck = 'valid' | 'invalid' | 'unknown';

export interface Context7Mcp {
  refresh: () => Promise<void>;
}

const keyCheckUrl = 'https://context7.com/api/v2/libs/search?libraryName=react';
const serverUrl = 'https://mcp.context7.com/mcp';
const oauthServerUrl = `${serverUrl}/oauth`;

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function registerContext7Mcp(
  context: vscode.ExtensionContext,
  store: SettingsStore
): Context7Mcp {
  const mcpDefinitionsChanged = new vscode.EventEmitter<void>();
  let context7ApiKey = '';
  let context7AuthMode: Context7AuthMode = store.getContext7AuthMode();
  const keyCache = new Map<string, { check: KeyCheck; checkedAt: number }>();
  const inFlight = new Map<string, Promise<KeyCheck>>();
  const warnedKeys = new Set<string>();

  const checkApiKey = (key: string, force = false): Promise<KeyCheck> => {
    const cached = keyCache.get(key);
    const ttl = cached?.check === 'valid' ? 600_000 : cached?.check === 'invalid' ? 300_000 : 60_000;
    if (!force && cached && Date.now() - cached.checkedAt < ttl) {
      return Promise.resolve(cached.check);
    }
    const pending = inFlight.get(key);
    if (pending) {
      return pending;
    }
    const request = (async () => {
      if (!key.startsWith('ctx7sk-')) {
        keyCache.set(key, { check: 'invalid', checkedAt: Date.now() });
        return 'invalid' as const;
      }
      try {
        const response = await fetch(keyCheckUrl, {
          method: 'HEAD',
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10_000)
        });
        const check: KeyCheck =
          response.status === 401 || response.status === 403
            ? 'invalid'
            : response.status === 402 || response.status === 429 || response.ok
              ? 'valid'
              : 'unknown';
        keyCache.set(key, { check, checkedAt: Date.now() });
        return check;
      } catch {
        keyCache.set(key, { check: 'unknown', checkedAt: Date.now() });
        return 'unknown';
      }
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };

  const buildHeaders = async (): Promise<Record<string, string>> => {
    if (context7AuthMode === 'oauth' || !context7ApiKey) {
      return {};
    }
    const check = await checkApiKey(context7ApiKey);
    if (check === 'valid') {
      return { Authorization: `Bearer ${context7ApiKey}` };
    }
    if (check === 'invalid' && !warnedKeys.has(context7ApiKey)) {
      warnedKeys.add(context7ApiKey);
      void vscode.window.showWarningMessage(
        vscode.l10n.t(
          'Context7: the configured API key was rejected. Continuing with anonymous access.'
        )
      );
    }
    return {};
  };

  const refresh = async (): Promise<void> => {
    context7AuthMode = store.getContext7AuthMode();
    context7ApiKey = (await store.getContext7ApiKey())?.trim() ?? '';
    keyCache.clear();
    warnedKeys.clear();
    await vscode.commands.executeCommand(
      'setContext',
      'myVscodeExtension.context7AuthMode',
      context7AuthMode
    );
    mcpDefinitionsChanged.fire();
  };

  void vscode.commands.executeCommand(
    'setContext',
    'myVscodeExtension.context7AuthMode',
    context7AuthMode
  );
  void store.getContext7ApiKey().then((key) => {
    context7ApiKey = key?.trim() ?? '';
    mcpDefinitionsChanged.fire();
  });

  context.subscriptions.push(
    mcpDefinitionsChanged,
    context.secrets.onDidChange((event) => {
      if (event.key === 'context7.apiKey') {
        void refresh();
      }
    }),
    vscode.lm.registerMcpServerDefinitionProvider('fangfuzha/context7', {
      onDidChangeMcpServerDefinitions: mcpDefinitionsChanged.event,
      async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
        const headers = await buildHeaders();
        const keyVersion =
          context7AuthMode === 'token' && context7ApiKey
            ? fingerprint(context7ApiKey)
            : 'anonymous';
        return [
          new vscode.McpHttpServerDefinition(
            'Context7',
            vscode.Uri.parse(context7AuthMode === 'oauth' ? oauthServerUrl : serverUrl),
            headers,
            `${context7AuthMode}:${keyVersion}`
          )
        ];
      },
      async resolveMcpServerDefinition(server: vscode.McpHttpServerDefinition) {
        server.headers = await buildHeaders();
        return server;
      }
    }),
    vscode.commands.registerCommand('my-vscode-extension.context7.useTokenMode', async () => {
      await store.update({ 'context7.authMode': 'token' });
      await refresh();
    }),
    vscode.commands.registerCommand('my-vscode-extension.context7.useOAuthMode', async () => {
      await store.update({ 'context7.authMode': 'oauth' });
      await refresh();
    }),
    vscode.commands.registerCommand('my-vscode-extension.context7.checkApiKey', async () => {
      const key = (await store.getContext7ApiKey())?.trim() ?? '';
      if (!key) {
        void vscode.window.showInformationMessage(
          vscode.l10n.t('Context7: no API key is configured.')
        );
        return;
      }
      const check = await checkApiKey(key, true);
      void (check === 'valid'
        ? vscode.window.showInformationMessage(vscode.l10n.t('Context7: the API key is valid.'))
        : check === 'invalid'
          ? vscode.window.showWarningMessage(
              vscode.l10n.t('Context7: the API key was rejected by Context7.')
            )
          : vscode.window.showWarningMessage(
              vscode.l10n.t(
                'Context7: the API key could not be verified because Context7 did not answer.'
              )
            ));
    })
  );

  return { refresh };
}
