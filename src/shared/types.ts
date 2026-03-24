/**
 * Video Companion - 类型定义
 */

// 用户设置
export interface UserSettings {
  enabled: boolean;
  defaultSpeed: number;
  showPanel: boolean;
  showContextMenu: boolean;
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

// m3u8 源信息
export interface M3u8Source {
  url: string;
  pageUrl: string;
  timestamp: number;
  fromIntercept: boolean;
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
  | 'settingsChanged'
  | 'extensionEnabled'
  | 'extensionDisabled'
  | 'getVideoCount'
  | 'openVideoPlayer';

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
  count?: number;
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

// ============ 视频检测系统类型 ============

// 容器评分结果
export interface ContainerScore {
  element: HTMLElement;
  score: number;
  reasons: string[];
  verified: boolean;
}

// 容器检测规则
export interface ContainerRule {
  name: string;
  weight: number;
  test: (element: HTMLElement, video: HTMLVideoElement) => boolean;
}

// 检测结果
export interface DetectionResult {
  hasCustomControls: boolean;
  confidence: 'high' | 'medium' | 'low';
  detectedBy: string;
}

// 视频生命周期事件
export interface VideoLifecycleEvents {
  onVideoAdded: (video: HTMLVideoElement) => void;
  onVideoRemoved: (video: HTMLVideoElement) => void;
  onVideoReplaced?: (
    oldVideo: HTMLVideoElement,
    newVideo: HTMLVideoElement,
    container: HTMLElement
  ) => void;
  onVideoResized?: (video: HTMLVideoElement) => void;
}

// 播放器插件
export interface PlayerPlugin {
  name: string;
  priority: number;
  detect: (video: HTMLVideoElement, container: HTMLElement) => boolean;
  getContainer?: (video: HTMLVideoElement) => HTMLElement | null;
}

// 缓存条目
export interface CacheEntry<T> {
  result: T;
  timestamp: number;
  containerSnapshot: string;
}
