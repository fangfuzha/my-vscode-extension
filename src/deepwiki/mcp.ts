import * as vscode from 'vscode';

import { SettingsStore } from '../config/store';

type DeepWikiAuthMode = 'public' | 'devin';

export interface DeepWikiMcp {
  refresh: () => Promise<void>;
}

const publicServerUrl = 'https://mcp.deepwiki.com/mcp';
const authenticatedServerUrl = 'https://mcp.devin.ai/mcp';

export function registerDeepWikiMcp(
  context: vscode.ExtensionContext,
  store: SettingsStore
): DeepWikiMcp {
  const definitionsChanged = new vscode.EventEmitter<void>();
  let authMode: DeepWikiAuthMode =
    store.get<string>('deepwiki.authMode') === 'devin' ? 'devin' : 'public';
  let apiKey = '';

  const refresh = async (): Promise<void> => {
    authMode = store.get<string>('deepwiki.authMode') === 'devin' ? 'devin' : 'public';
    apiKey = (await context.secrets.get('deepwiki.apiKey'))?.trim() ?? '';
    definitionsChanged.fire();
  };

  void refresh();

  context.subscriptions.push(
    definitionsChanged,
    context.secrets.onDidChange((event) => {
      if (event.key === 'deepwiki.apiKey') {
        void refresh();
      }
    }),
    vscode.lm.registerMcpServerDefinitionProvider('fangfuzha/deepwiki', {
      onDidChangeMcpServerDefinitions: definitionsChanged.event,
      provideMcpServerDefinitions(): vscode.McpServerDefinition[] {
        const authenticated = authMode === 'devin';
        return [
          new vscode.McpHttpServerDefinition(
            'DeepWiki',
            vscode.Uri.parse(authenticated ? authenticatedServerUrl : publicServerUrl),
            authenticated && apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
            `${authMode}:${authenticated && apiKey ? 'configured' : 'anonymous'}`
          )
        ];
      },
      resolveMcpServerDefinition(server: vscode.McpHttpServerDefinition) {
        server.headers =
          authMode === 'devin' && apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        return server;
      }
    })
  );

  return { refresh };
}
