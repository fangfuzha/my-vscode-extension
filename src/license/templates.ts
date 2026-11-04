/**
 * 占位符替换：按许可证正文里出现的占位符标记统一处理，
 * 新增许可证时无需再改代码（上游是按 license key 写 switch 分支，容易漏）。
 */

const AUTHOR_TOKENS: RegExp[] = [
  /\[fullname\]/g,
  /<name of author>/g,
  /\[name of copyright owner\]/g,
  /\[copyright holder\]/g
];

const YEAR_TOKENS: RegExp[] = [
  /<year>/g,
  /\[year\]/g,
  /\[yyyy\]/g
];

export function applyAuthor(text: string, author: string): string {
  let result = text;
  for (const token of AUTHOR_TOKENS) {
    result = result.replace(token, author);
  }
  return result;
}

export function applyYear(text: string, year: string, key: string): string {
  // WTFPL 正文里的年份是硬编码的 2004，需要替换第二个出现位置。
  if (key === 'wtfpl') {
    let seen = 0;
    return text.replace(/2004/g, (match) => (++seen === 2 ? year : match));
  }

  let result = text;
  for (const token of YEAR_TOKENS) {
    result = result.replace(token, year);
  }
  return result;
}

export function renderLicenseBody(
  body: string,
  key: string,
  author: string,
  year: string
): string {
  let result = body;
  if (year) {
    result = applyYear(result, year, key);
  }
  if (author) {
    result = applyAuthor(result, author);
  }
  return result;
}

/** 各许可证的惯用文件名（优先于用户自定义的 filename）。 */
export const CONVENTIONAL_FILENAMES: Record<string, string> = {
  unlicense: 'UNLICENSE',
  'gpl-2.0': 'COPYING',
  'gpl-3.0': 'COPYING'
};
