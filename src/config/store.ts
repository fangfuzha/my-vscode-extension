import * as vscode from 'vscode';

import { ALL_FIELDS, FIELD_BY_KEY, SYNC_KEYS } from './schema';

export interface LicenseSettings {
  defaultKey: string;
  author: string;
  year: string;
  filename: string;
  extension: string;
  useConventionalFilename: boolean;
}

export type SettingValue = string | boolean;

export class SettingsStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  /** 一次性声明参与 Settings Sync 的全部 key（setKeysForSync 是全量替换语义）。 */
  init(): void {
    this.context.globalState.setKeysForSync(SYNC_KEYS);
  }

  getAll(): Record<string, SettingValue> {
    const values: Record<string, SettingValue> = {};
    for (const field of ALL_FIELDS) {
      values[field.key] = this.context.globalState.get<SettingValue>(
        field.key,
        field.defaultValue
      );
    }
    return values;
  }

  get<T extends SettingValue>(key: string): T {
    const field = FIELD_BY_KEY.get(key);
    return this.context.globalState.get<T>(key, (field?.defaultValue ?? '') as T);
  }

  async update(values: Record<string, SettingValue | undefined>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || !FIELD_BY_KEY.has(key)) {
        continue;
      }
      await this.context.globalState.update(key, value);
    }
  }

  async reset(): Promise<void> {
    for (const key of SYNC_KEYS) {
      await this.context.globalState.update(key, undefined);
    }
  }

  getLicense(): LicenseSettings {
    return {
      defaultKey: this.get<string>('license.default'),
      author: this.get<string>('license.author'),
      year: this.get<string>('license.year'),
      filename: this.get<string>('license.filename'),
      extension: this.get<string>('license.extension'),
      useConventionalFilename: this.get<boolean>('license.useConventionalFilename')
    };
  }
}
