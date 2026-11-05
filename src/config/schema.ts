import * as vscode from 'vscode';

/**
 * 扩展所有可配置项的声明式描述。
 * 新增功能 = 在这里加一个 section / field，
 * 面板、存储与同步会自动跟着扩展。
 */

export type FieldType = 'text' | 'password' | 'select' | 'checkbox' | 'color';

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
  /** 所属分组 id，对应 SectionDescriptor.groups。 */
  group?: string;
}

/** 面板里的字段分组，用来给同类型的选项起一个小标题。 */
export interface GroupDescriptor {
  id: string;
  title: string;
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
  groups?: GroupDescriptor[];
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
    id: 'svg',
    title: vscode.l10n.t('SVG'),
    description: vscode.l10n.t(
      'Hover and gutter previews for SVG inside source code, plus SVGO optimization.'
    ),
    groups: [
      { id: 'preview', title: vscode.l10n.t('Preview options') },
      { id: 'optimize', title: vscode.l10n.t('SVGO optimization options') }
    ],
    fields: [
      {
        key: 'svg.enableHover',
        type: 'checkbox',
        label: vscode.l10n.t('Enable hover preview'),
        hint: vscode.l10n.t('Show a preview when hovering SVG markup in source files.'),
        defaultValue: true,
        group: 'preview'
      },
      {
        key: 'svg.showGutterPreview',
        type: 'checkbox',
        label: vscode.l10n.t('Show gutter icons'),
        hint: vscode.l10n.t('Show a small SVG thumbnail next to the line numbers.'),
        defaultValue: true,
        group: 'preview'
      },

      {
        key: 'svg.removeClasses',
        type: 'checkbox',
        label: vscode.l10n.t('Remove class attributes'),
        hint: vscode.l10n.t(
          'Only applies to standalone .svg files. Inline framework SVGs always keep their classes.'
        ),
        defaultValue: true,
        group: 'optimize'
      },
      {
        key: 'svg.removeComments',
        type: 'checkbox',
        label: vscode.l10n.t('Remove comments'),
        hint: vscode.l10n.t('Remove XML comments while optimizing.'),
        defaultValue: true,
        group: 'optimize'
      },
      {
        key: 'svg.removeDoctype',
        type: 'checkbox',
        label: vscode.l10n.t('Remove DOCTYPE'),
        hint: vscode.l10n.t('Remove the <!DOCTYPE> declaration while optimizing.'),
        defaultValue: true,
        group: 'optimize'
      },
      {
        key: 'svg.cleanupIds',
        type: 'checkbox',
        label: vscode.l10n.t('Clean up unused IDs'),
        hint: vscode.l10n.t(
          'Disabled by default because it can break sprites, references and animations.'
        ),
        defaultValue: false,
        group: 'optimize'
      },
      {
        key: 'svg.floatPrecision',
        type: 'text',
        label: vscode.l10n.t('Float precision'),
        hint: vscode.l10n.t('Decimal places kept for numbers, from 0 to 10.'),
        defaultValue: '3',
        group: 'optimize'
      },
      {
        key: 'svg.multipass',
        type: 'checkbox',
        label: vscode.l10n.t('Multipass optimization'),
        hint: vscode.l10n.t('Keep optimizing until the output stops shrinking.'),
        defaultValue: true,
        group: 'optimize'
      },

      {
        key: 'svg.removeViewBox',
        type: 'checkbox',
        label: vscode.l10n.t('Remove viewBox'),
        hint: vscode.l10n.t('Delete the viewBox attribute. This breaks responsive scaling.'),
        defaultValue: false,
        group: 'optimize'
      },
      {
        key: 'svg.removeDimensions',
        type: 'checkbox',
        label: vscode.l10n.t('Remove width and height'),
        hint: vscode.l10n.t(
          'Delete the root width and height attributes so the SVG fills its container.'
        ),
        defaultValue: false,
        group: 'optimize'
      },
      {
        key: 'svg.prefixIds',
        type: 'checkbox',
        label: vscode.l10n.t('Prefix IDs'),
        hint: vscode.l10n.t('Prefix every ID to avoid conflicts when inlining several icons.'),
        defaultValue: false,
        group: 'optimize'
      },
      {
        key: 'svg.mergePaths',
        type: 'checkbox',
        label: vscode.l10n.t('Merge paths'),
        hint: vscode.l10n.t('Turn it off if CSS targets a single path.'),
        defaultValue: true,
        group: 'optimize'
      },
      {
        key: 'svg.convertShapeToPath',
        type: 'checkbox',
        label: vscode.l10n.t('Convert shapes to paths'),
        hint: vscode.l10n.t('Convert rect, circle and ellipse into path elements.'),
        defaultValue: true,
        group: 'optimize'
      },
      {
        key: 'svg.collapseGroups',
        type: 'checkbox',
        label: vscode.l10n.t('Collapse groups'),
        hint: vscode.l10n.t('Turn it off if CSS targets a group element.'),
        defaultValue: true,
        group: 'optimize'
      }
    ]
  },
  {
    id: 'highlight',
    title: vscode.l10n.t('Highlight'),
    description: vscode.l10n.t(
      'Highlight every occurrence of the selected text in the editor and mark it in the minimap.'
    ),
    groups: [
      { id: 'appearance', title: vscode.l10n.t('Appearance') },
      { id: 'matching', title: vscode.l10n.t('Matching') }
    ],
    fields: [
      {
        key: 'highlight.enable',
        type: 'checkbox',
        label: vscode.l10n.t('Enable selection highlight'),
        hint: vscode.l10n.t(
          'Highlight the selected text everywhere it appears in the current document.'
        ),
        defaultValue: true,
        group: 'appearance'
      },
      {
        key: 'highlight.backgroundColor',
        type: 'color',
        label: vscode.l10n.t('Text background color'),
        hint: vscode.l10n.t(
          'Background color of the highlighted text in the editor. Pick a color or type any CSS color.'
        ),
        defaultValue: '#d4d4d4',
        group: 'appearance'
      },
      {
        key: 'highlight.overviewRulerColor',
        type: 'color',
        label: vscode.l10n.t('Minimap marker color'),
        hint: vscode.l10n.t(
          'Color of the marker shown in the minimap and the overview ruler. Pick a color or type any CSS color.'
        ),
        defaultValue: '#ff00c7',
        group: 'appearance'
      },
      {
        key: 'highlight.matchWholeDocument',
        type: 'checkbox',
        label: vscode.l10n.t('Match whole document'),
        hint: vscode.l10n.t(
          'Also match occurrences outside the current selection, in the whole document.'
        ),
        defaultValue: true,
        group: 'matching'
      },
      {
        key: 'highlight.maxSelectionLength',
        type: 'text',
        label: vscode.l10n.t('Maximum selection length'),
        hint: vscode.l10n.t(
          'Selections longer than this many characters are not matched against the document.'
        ),
        defaultValue: '200',
        group: 'matching'
      }
    ],
    actions: [
      {
        id: 'clearHighlight',
        label: vscode.l10n.t('Clear highlight'),
        action: 'clearHighlight',
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
    id: 'githubLink',
    title: vscode.l10n.t('GitHub links'),
    description: vscode.l10n.t(
      'Build a GitHub URL for the current file so you can open it in the browser.'
    ),
    fields: [
      {
        key: 'github.useCommitSha',
        type: 'checkbox',
        label: vscode.l10n.t('Always use the commit SHA'),
        hint: vscode.l10n.t(
          'Use the last commit instead of the branch name. Branch names containing a slash also fall back to the commit.'
        ),
        defaultValue: false
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
