import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);

/** 从 git config user.name 推断作者。 */
export async function detectAuthor(folder: string): Promise<string | undefined> {
  try {
    const { stdout } = await exec('git', ['-C', folder, 'config', 'user.name']);
    const name = stdout.trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

/** 用仓库首次提交年份作为许可证年份。 */
export async function detectYear(folder: string): Promise<string | undefined> {
  try {
    const { stdout } = await exec('git', [
      '-C',
      folder,
      'log',
      '--reverse',
      '--format=%ad',
      '--date=format:%Y'
    ]);
    const first = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)[0];
    return first || undefined;
  } catch {
    return undefined;
  }
}
