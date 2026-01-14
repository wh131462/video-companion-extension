/**
 * Video Companion - 常量配置
 */

import type { UserSettings, Stats } from './types';

// 倍速选项
export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;

// 默认设置
export const DEFAULT_SETTINGS: UserSettings = {
  defaultSpeed: 1,
  showPanel: true,
  panelPosition: 'top-right',
  enableShortcuts: true,
  autoHidePanel: true,
  autoHideDelay: 3000,
};

// 默认统计
export const DEFAULT_STATS: Stats = {
  installDate: Date.now(),
  videosEnhanced: 0,
};

// 视频最小尺寸（跳过小视频如广告）
export const MIN_VIDEO_SIZE = {
  width: 100,
  height: 100,
};

// 面板自动隐藏延迟
export const PANEL_HIDE_DELAY = 3000;

// Toast 显示时长
export const TOAST_DURATION = 2000;

// 视频扫描间隔
export const SCAN_INTERVAL = 2000;

// CSS 类名前缀
export const CSS_PREFIX = 'vc';

// CSS 类名
export const CSS_CLASSES = {
  panel: `${CSS_PREFIX}-control-panel`,
  visible: `${CSS_PREFIX}-visible`,
  button: `${CSS_PREFIX}-btn`,
  buttonContainer: `${CSS_PREFIX}-button-container`,
  speedButton: `${CSS_PREFIX}-speed-btn`,
  speedMenu: `${CSS_PREFIX}-speed-menu`,
  speedItem: `${CSS_PREFIX}-speed-item`,
  active: `${CSS_PREFIX}-active`,
  show: `${CSS_PREFIX}-show`,
  toast: `${CSS_PREFIX}-toast`,
  toastShow: `${CSS_PREFIX}-toast-show`,
  tooltip: `${CSS_PREFIX}-tooltip`,
  webFullscreen: `${CSS_PREFIX}-web-fullscreen`,
  bodyFullscreen: `${CSS_PREFIX}-body-fullscreen`,
  wrapper: `${CSS_PREFIX}-wrapper`,
} as const;

// 速度变化步长
export const SPEED_STEP = 0.25;

// 速度范围
export const SPEED_RANGE = {
  min: 0.25,
  max: 3,
};

// Z-Index 层级
export const Z_INDEX = {
  panel: 2147483647,
  webFullscreen: 2147483646,
};
