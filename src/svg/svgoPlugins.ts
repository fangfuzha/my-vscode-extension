/**
 * Copyright 2025 Miguel Ángel Durán
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * 用户可配置的 SVGO 选项，读取自 betterSvg.* 设置。
 * 放在不含 vscode 依赖的模块里，方便脱离扩展宿主做单元测试。
 */

export interface SvgoOptions {
  removeClasses: boolean;
  removeComments: boolean;
  removeDoctype: boolean;
  cleanupIds: boolean;
  floatPrecision: number;
  multipass: boolean;
  /** 删除 viewBox（会破坏响应式缩放），默认关闭。 */
  removeViewBox: boolean;
  /** 删除根节点的 width/height，默认关闭。 */
  removeDimensions: boolean;
  /** 给所有 id 加前缀，避免内联多个图标时 id 冲突，默认关闭。 */
  prefixIds: boolean;
  /** 合并相邻路径，默认开启。 */
  mergePaths: boolean;
  /** 把 rect/circle 等基本形状转成 path，默认开启。 */
  convertShapeToPath: boolean;
  /** 打平 <g> 分组，默认开启。 */
  collapseGroups: boolean;
}

export function getSvgoPlugins(options: SvgoOptions): any[] {
  const { removeClasses, removeComments, removeDoctype, cleanupIds } = options;

  // preset-default 的 overrides：值为 false 表示关掉该插件。
  const overrides: Record<string, unknown> = {
    // 仅在用户主动开启时压缩并清理未使用的 id（会破坏 sprite 与引用）。
    cleanupIds: cleanupIds ? {} : false,
    // 移除未知属性与默认值（保留 class 时关闭，避免误删 onClick 之类）。
    removeUnknownsAndDefaults: removeClasses
  };

  if (removeClasses) {
    // 准备删 class 时，先把 <style> 里的 class 规则内联到元素上，
    // 否则只删 class 会让靠 class 上色的元素掉回默认填充色。
    // onlyMatchedOnce: false 让被多个元素共用的规则也内联到每个元素上。
    overrides.inlineStyles = { onlyMatchedOnce: false };
  }

  // 这三个插件在 preset-default 里默认开启，关掉它们可以保留原始结构。
  if (!options.mergePaths) {
    overrides.mergePaths = false;
  }
  if (!options.convertShapeToPath) {
    overrides.convertShapeToPath = false;
  }
  if (!options.collapseGroups) {
    overrides.collapseGroups = false;
  }

  const plugins: any[] = [
    {
      name: 'preset-default',
      params: { overrides }
    }
  ];

  if (removeDoctype) {
    plugins.push('removeDoctype');
  }

  if (removeComments) {
    plugins.push('removeComments');
  }

  // opt-in 插件：preset-default 不包含，按用户设置显式加入。
  if (options.removeViewBox) {
    plugins.push('removeViewBox');
  }
  if (options.removeDimensions) {
    plugins.push('removeDimensions');
  }
  if (options.prefixIds) {
    plugins.push('prefixIds');
  }

  plugins.push({
    name: 'removeAttrs',
    params: {
      // 移除大多数情况下没用的属性
      attrs: ['xmlns:xlink', 'xml:space', ...(removeClasses ? ['class'] : [])]
    }
  });

  return plugins;
}
