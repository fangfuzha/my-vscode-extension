import { SettingsStore } from '../config/store';

export interface HighlightSettings {
  /** 是否启用选中文本高亮。 */
  enabled: boolean;
  /** 编辑器正文中高亮文字的背景色。 */
  backgroundColor: string;
  /** 小地图 / 概览标尺上的标记颜色。 */
  overviewRulerColor: string;
  /** 是否在整篇文档里匹配选中的文本。 */
  matchWholeDocument: boolean;
  /** 选区文本超过这个长度就不做全文匹配，只高亮选区本身。 */
  maxSelectionLength: number;
}

export const DEFAULT_BACKGROUND_COLOR = '#d4d4d4';
export const DEFAULT_OVERVIEW_RULER_COLOR = '#ff00c7';

export function readHighlightSettings(store: SettingsStore): HighlightSettings {
  const rawLength = Number.parseInt(store.get<string>('highlight.maxSelectionLength'), 10);

  return {
    enabled: store.get<boolean>('highlight.enable'),
    backgroundColor:
      store.get<string>('highlight.backgroundColor') || DEFAULT_BACKGROUND_COLOR,
    overviewRulerColor:
      store.get<string>('highlight.overviewRulerColor') || DEFAULT_OVERVIEW_RULER_COLOR,
    matchWholeDocument: store.get<boolean>('highlight.matchWholeDocument'),
    maxSelectionLength:
      Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 200
  };
}
