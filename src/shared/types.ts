/**
 * Video Companion - 类型定义
 */

// 用户设置
export interface UserSettings {
  defaultSpeed: number;
  showPanel: boolean;
  panelPosition: PanelPosition;
  enableShortcuts: boolean;
  autoHidePanel: boolean;
  autoHideDelay: number;
}

// 面板位置
export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// 统计数据
export interface Stats {
  installDate: number;
  videosEnhanced: number;
}

// 消息类型
export type MessageAction =
  | 'getSettings'
  | 'saveSettings'
  | 'updateStats'
  | 'getStats'
  | 'togglePanel'
  | 'togglePiP'
  | 'toggleFullscreen'
  | 'screenshot'
  | 'setSpeed'
  | 'speedUp'
  | 'speedDown'
  | 'settingsChanged';

// 消息接口
export interface Message {
  action: MessageAction;
  settings?: UserSettings;
  stats?: Partial<Stats>;
  speed?: number;
}

// 消息响应
export interface MessageResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

// 功能模块接口
export interface VideoFeature {
  name: string;
  execute(video: HTMLVideoElement): void | Promise<void>;
}

// 右键菜单项 ID
export type MenuItemId =
  | 'vc-pip'
  | 'vc-screenshot'
  | 'vc-speed-menu'
  | `vc-speed-${number}`;

// 快捷键命令
export type CommandName =
  | 'toggle-pip'
  | 'toggle-fullscreen'
  | 'speed-up'
  | 'speed-down';

// 存储区域
export interface StorageData {
  settings: UserSettings;
  stats: Stats;
}
