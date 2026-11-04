/**
 * SVG 模块的公共类型。
 */

export interface SvgSettings {
  /** 是否启用悬停预览。 */
  enableHover: boolean;
  /** 是否在行号槽显示 SVG 缩略图。 */
  showGutterPreview: boolean;

  /** 优化独立 SVG 时移除 class 属性（内联 SVG 始终保留）。 */
  removeClasses: boolean;
  /** 优化时移除注释。 */
  removeComments: boolean;
  /** 优化时移除 DOCTYPE 声明。 */
  removeDoctype: boolean;
  /** 优化时压缩并清理未使用的 id（会破坏 sprite 与引用，默认关闭）。 */
  cleanupIds: boolean;
  /** 浮点数保留的小数位数。 */
  floatPrecision: number;
  /** 反复优化直到体积不再变小。 */
  multipass: boolean;
  /** 删除 viewBox（破坏响应式缩放）。 */
  removeViewBox: boolean;
  /** 删除根节点的 width/height。 */
  removeDimensions: boolean;
  /** 给所有 id 加前缀，避免内联多个图标时冲突。 */
  prefixIds: boolean;
  /** 合并相邻路径。 */
  mergePaths: boolean;
  /** 把 rect/circle 等基本形状转成 path。 */
  convertShapeToPath: boolean;
  /** 打平 <g> 分组。 */
  collapseGroups: boolean;
}
