import * as vscode from 'vscode';

import { fetchLicense, fetchLicenses, RateLimitError, UNCOMMON_LICENSES } from './api';
import { detectAuthor, detectYear } from './git';
import { LicenseSettings, SettingsStore } from '../config/store';
import { renderLicenseBody } from './templates';
import { LicenseItem } from './types';
import { resolveFileName, resolveTargetFolder, writeLicenseFile } from './writer';

export interface LicenseDeps {
  store: SettingsStore;
  getToken: (interactive: boolean) => Promise<string | undefined>;
  onSettingsChanged: () => void;
}

interface QuickPickLicense extends vscode.QuickPickItem {
  key?: string;
}

function toQuickPick(items: LicenseItem[], defaultKey: string): QuickPickLicense[] {
  return items.map((item) => {
    const isDefault = item.key === defaultKey || item.spdx_id === defaultKey;
    return {
      label: item.spdx_id ?? item.key,
      detail: item.name,
      description: isDefault ? vscode.l10n.t('Default') : item.description,
      alwaysShow: isDefault,
      key: item.key
    };
  });
}

/** 带一次「登录 GitHub 后重试」的限流兜底。 */
async function withRateLimitRetry<T>(
  deps: LicenseDeps,
  action: (token?: string) => Promise<T>
): Promise<T> {
  const token = await deps.getToken(false);
  try {
    return await action(token);
  } catch (error) {
    if (!(error instanceof RateLimitError)) {
      throw error;
    }

    const signIn = vscode.l10n.t('Sign in to GitHub');
    const choice = await vscode.window.showErrorMessage(
      error.resetAt
        ? vscode.l10n.t(
            'GitHub API rate limit reached. Try again after {0} or sign in to GitHub.',
            error.resetAt.toLocaleString()
          )
        : vscode.l10n.t('GitHub API rate limit reached. Sign in to GitHub and try again.'),
      signIn
    );

    if (choice !== signIn) {
      throw error;
    }

    const fresh = await deps.getToken(true);
    if (!fresh) {
      throw error;
    }
    return action(fresh);
  }
}

async function resolveAuthorAndYear(
  settings: LicenseSettings,
  folder: string
): Promise<{ author: string; year: string }> {
  let author = settings.author.trim();
  if (!author) {
    author = (await detectAuthor(folder)) ?? '';
  }

  let year = settings.year.trim();
  if (!year) {
    year = (await detectYear(folder)) ?? String(new Date().getFullYear());
  }

  return { author, year };
}

async function writeLicenses(
  deps: LicenseDeps,
  items: LicenseItem[],
  multiple: boolean
): Promise<void> {
  const folder = await resolveTargetFolder();
  if (!folder) {
    vscode.window.showErrorMessage(vscode.l10n.t('No folder to create a license.'));
    return;
  }

  const settings = deps.store.getLicense();
  const { author, year } = await resolveAuthorAndYear(settings, folder.uri.fsPath);

  for (const item of items) {
    const license = await withRateLimitRetry(deps, (token) => fetchLicense(item.key, token));
    const body = renderLicenseBody(license.body, item.key, author, year);
    const fileName = resolveFileName(settings, item.key, item.spdx_id, multiple);
    const target = vscode.Uri.joinPath(folder.uri, fileName);

    const written = await writeLicenseFile(target, body, fileName);
    if (written) {
      vscode.window.showInformationMessage(
        vscode.l10n.t('Created {0} in {1}.', fileName, folder.name)
      );
    }
  }
}

export async function addLicense(deps: LicenseDeps, multiple: boolean): Promise<void> {
  try {
    const common = await withRateLimitRetry(deps, (token) => fetchLicenses(token));
    const items = [...common, ...UNCOMMON_LICENSES];
    const settings = deps.store.getLicense();

    const quickPick: QuickPickLicense[] = toQuickPick(common, settings.defaultKey);
    quickPick.push({
      label: vscode.l10n.t('Uncommon licenses'),
      kind: vscode.QuickPickItemKind.Separator
    });
    quickPick.push(...toQuickPick(UNCOMMON_LICENSES, settings.defaultKey));

    const selected = await vscode.window.showQuickPick(quickPick, {
      canPickMany: multiple,
      placeHolder: multiple
        ? vscode.l10n.t('Select one or more licenses to create.')
        : vscode.l10n.t('Select a license to create.')
    });

    if (!selected) {
      return;
    }

    const picked = (Array.isArray(selected) ? selected : [selected]).filter(
      (item): item is QuickPickLicense => Boolean(item.key)
    );
    if (picked.length === 0) {
      return;
    }

    await writeLicenses(
      deps,
      picked.map((item) => items.find((entry) => entry.key === item.key)).filter(Boolean) as LicenseItem[],
      multiple
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to fetch licenses: {0}', (error as Error).message)
    );
  }
}

export async function addDefaultLicense(deps: LicenseDeps): Promise<void> {
  const settings = deps.store.getLicense();
  if (!settings.defaultKey) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('No default license configured. Open the manager panel to set one.')
    );
    return;
  }

  try {
    const common = await withRateLimitRetry(deps, (token) => fetchLicenses(token));
    const items = [...common, ...UNCOMMON_LICENSES];
    const item = items.find(
      (entry) => entry.key === settings.defaultKey || entry.spdx_id === settings.defaultKey
    );

    if (!item) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('Default license {0} was not found.', settings.defaultKey)
      );
      return;
    }

    await writeLicenses(deps, [item], false);
  } catch (error) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to fetch licenses: {0}', (error as Error).message)
    );
  }
}
