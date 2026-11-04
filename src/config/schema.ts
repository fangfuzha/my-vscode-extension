import * as vscode from 'vscode';

/**
 * 扩展所有可配置项的声明式描述。
 * 新增功能 = 在这里加一个 section / field，
 * 面板、存储与同步会自动跟着扩展。
 */

export type FieldType = 'text' | 'select' | 'checkbox';

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
  }
];

export const ALL_FIELDS: FieldDescriptor[] = SECTIONS.flatMap((section) => section.fields ?? []);

export const SYNC_KEYS: readonly string[] = ALL_FIELDS.map((field) => field.key);

export const FIELD_BY_KEY = new Map(ALL_FIELDS.map((field) => [field.key, field]));
