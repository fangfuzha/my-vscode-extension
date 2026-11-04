/**
 * SVG 模块常量。
 */

/** 支持在源码内识别内联 SVG 的语言 id。 */
export const SUPPORTED_LANGUAGES: string[] = [
  'astro',
  'blade',
  'django-html',
  'ejs',
  'erb',
  'html',
  'javascript',
  'javascriptreact',
  'liquid',
  'php',
  'svelte',
  'svg',
  'typescript',
  'typescriptreact',
  'vue',
  'xml'
];


/** React 系语言：属性名用 camelCase。 */
export const CAMEL_CASE_LANGUAGES = ['javascriptreact', 'typescriptreact'];
