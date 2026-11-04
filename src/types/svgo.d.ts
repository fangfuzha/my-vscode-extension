/**
 * svgo 4 是纯 ESM 包：在 Node16 模块解析下，TypeScript 会把它的类型声明
 * 判定为 ESM，从而无法被本扩展的 CommonJS 产物 require。
 * 这里给出等价的最小类型声明。
 *
 * 注意：入口必须用 'svgo/browser'，不能用 'svgo'。
 * 'svgo' 的 node 构建把 csso / css-tree 留在外部，它们在 ESM 源码里用
 * createRequire(import.meta.url)；esbuild 打成 CommonJS 后 import.meta.url
 * 是 undefined，会在扩展「加载期」直接抛
 * "The argument 'filename' must be a file URL object, file URL string, or absolute path string."
 * 'svgo/browser' 是自包含的浏览器构建，不依赖 Node 文件系统，esbuild 可直接打包。
 */
declare module 'svgo' {
  export interface SvgPluginConfig {
    name: string;
    params?: Record<string, unknown>;
  }

  export interface OptimizeOptions {
    multipass?: boolean;
    floatPrecision?: number;
    plugins?: SvgPluginConfig[];
    path?: string;
    js2svg?: Record<string, unknown>;
  }

  export interface OptimizedSvg {
    data: string;
    info?: Record<string, unknown>;
    modernError?: string;
  }

  export function optimize(
    input: string,
    options?: OptimizeOptions
  ): OptimizedSvg;
}

/**
 * 浏览器版构建：自包含，不会在打包期引入 csso 这类依赖 Node 文件系统的 ESM 包。
 */
declare module 'svgo/browser' {
  export * from 'svgo';
}
