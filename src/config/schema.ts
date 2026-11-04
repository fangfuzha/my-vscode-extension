import * as vscode from 'vscode';

/**
 * 扩展所有可配置项的声明式描述。
 * 新增功能 = 在这里加一个 section / field，
 * 面板、存储与同步会自动跟着扩展。
 */

export type FieldType = 'text' | 'password' | 'select' | 'checkbox';

export interface FieldOption {
  value: string;
  label?: string;
}

export interface FieldDescriptor {
  key: string;
  type: FieldType;
  label: string;
  hint?: string;
  options?: FieldOption[];
  defaultValue: string | boolean;
  dynamicOptions?: 'licenses';
  storage?: 'secret';
}

export interface ActionDescriptor {
  id: string;
  label: string;
  action: string;
  variant?: 'primary' | 'secondary';
}

export interface SectionDescriptor {
  id: string;
  title: string;
  description?: string;
  fields?: FieldDescriptor[];
  actions?: ActionDescriptor[];
  status?: 'auth';
}

export const SECTIONS: SectionDescriptor[] = [
  {
    id: 'license',
    title: vscode.l10n.t('License'),
    description: vscode.l10n.t('Default settings for generating LICENSE files.'),
    fields: [
      {
        key: 'license.default',
        type: 'select',
        label: vscode.l10n.t('Default license'),
        hint: vscode.l10n.t('Load the license list first, then pick a default.'),
        defaultValue: '',
        dynamicOptions: 'licenses'
      },
      {
        key: 'license.author',
        type: 'text',
        label: vscode.l10n.t('Author'),
        hint: vscode.l10n.t('Leave empty to use git config user.name.'),
        defaultValue: ''
      },
      {
        key: 'license.year',
        type: 'text',
        label: vscode.l10n.t('Year'),
        hint: vscode.l10n.t('Leave empty to use the first commit year.'),
        defaultValue: ''
      },
      {
        key: 'license.filename',
        type: 'text',
        label: vscode.l10n.t('File name'),
        hint: vscode.l10n.t('GPL and Unlicense still use their conventional names.'),
        defaultValue: 'LICENSE'
      },
      {
        key: 'license.extension',
        type: 'select',
        label: vscode.l10n.t('File extension'),
        defaultValue: '',
        options: [
          { value: '', label: vscode.l10n.t('None') },
          { value: '.md' },
          { value: '.txt' }
        ]
      },
      {
        key: 'license.useConventionalFilename',
        type: 'checkbox',
        label: vscode.l10n.t('Use conventional file names'),
        defaultValue: true
      }
    ],
    actions: [
      {
        id: 'loadLicenses',
        label: vscode.l10n.t('Load license list'),
        action: 'loadLicenses',
        variant: 'secondary'
      },
      {
        id: 'add',
        label: vscode.l10n.t('Add license'),
        action: 'addLicense',
        variant: 'primary'
      },
      {
        id: 'addMultiple',
        label: vscode.l10n.t('Add multiple licenses'),
        action: 'addMultipleLicenses',
        variant: 'secondary'
      },
      {
        id: 'addDefault',
        label: vscode.l10n.t('Add default license'),
        action: 'addDefaultLicense',
        variant: 'secondary'
      }
    ]
  },
  {
    id: 'github',
    title: vscode.l10n.t('GitHub account'),
    description: vscode.l10n.t(
      'Signing in raises the GitHub API limit from 60 to 5000 requests per hour. The token is managed by VS Code and never stored.'
    ),
    status: 'auth',
    actions: [
      {
        id: 'signIn',
        label: vscode.l10n.t('Sign in to GitHub'),
        action: 'signIn',
        variant: 'primary'
      },
      {
        id: 'signOut',
        label: vscode.l10n.t('Sign out'),
        action: 'signOut',
        variant: 'secondary'
      }
    ]
  },
  {
    id: 'context7',
    title: vscode.l10n.t('Context7'),
    description: vscode.l10n.t(
      'Connect AI assistants to up-to-date library documentation through the Context7 MCP server.'
    ),
    fields: [
      {
        key: 'context7.apiKey',
        type: 'password',
        label: vscode.l10n.t('Context7 API key'),
        hint: vscode.l10n.t(
          'Optional. Get one from context7.com/dashboard. Clear the field to remove the current key.'
        ),
        defaultValue: '',
        storage: 'secret'
      },
      {
        key: 'context7.authMode',
        type: 'select',
        label: vscode.l10n.t('Context7 authentication mode'),
        hint: vscode.l10n.t(
          'Use an API token or let VS Code handle the Context7 OAuth sign-in flow.'
        ),
        defaultValue: 'token',
        options: [
          { value: 'token', label: vscode.l10n.t('API token') },
          { value: 'oauth', label: vscode.l10n.t('OAuth sign-in') }
        ]
      }
    ]
  },
  {
    id: 'deepwiki',
    title: vscode.l10n.t('DeepWiki'),
    description: vscode.l10n.t(
      'Read public repository documentation with DeepWiki, or use Devin authentication for private repositories.'
    ),
    fields: [
      {
        key: 'deepwiki.authMode',
        type: 'select',
        label: vscode.l10n.t('DeepWiki connection mode'),
        hint: vscode.l10n.t(
          'Public mode uses DeepWiki without authentication. Devin mode uses your Devin API key for private repositories.'
        ),
        defaultValue: 'public',
        options: [
          { value: 'public', label: vscode.l10n.t('Public DeepWiki') },
          { value: 'devin', label: vscode.l10n.t('Devin authenticated') }
        ]
      },
      {
        key: 'deepwiki.apiKey',
        type: 'password',
        label: vscode.l10n.t('Devin API key'),
        hint: vscode.l10n.t(
          'Required for Devin mode. Generate a key at app.devin.ai/settings/api-keys.'
        ),
        defaultValue: '',
        storage: 'secret'
      }
    ],
    actions: [
      {
        id: 'openDeepWikiApiKeys',
        label: vscode.l10n.t('Get Devin API key'),
        action: 'openDeepWikiApiKeys',
        variant: 'secondary'
      }
    ]
  }
];

export const ALL_FIELDS: FieldDescriptor[] = SECTIONS.flatMap((section) => section.fields ?? []);

export const SYNC_KEYS: readonly string[] = ALL_FIELDS
  .filter((field) => field.storage !== 'secret')
  .map((field) => field.key);

export const FIELD_BY_KEY = new Map(ALL_FIELDS.map((field) => [field.key, field]));
