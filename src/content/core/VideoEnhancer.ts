/**
 * 视频增强器主类
 */

import type { UserSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { ControlPanel } from '../ui/ControlPanel';
import { ContextMenu } from '../ui/ContextMenu';
import { VideoScanner } from './VideoScanner';
import { hasCustomControls } from '../utils/detectCustomControls';

export class VideoEnhancer {
  private scanner: VideoScanner;
  private panels = new Map<HTMLVideoElement, ControlPanel>();
  private contextMenus = new Map<HTMLVideoElement, ContextMenu>();
  private settings: UserSettings = DEFAULT_SETTINGS;
  // 记录用户手动关闭面板的视频 ID
  private closedPanels = new Set<string>();
  private videoIdCounter = 0;

  constructor() {
    this.scanner = new VideoScanner((video) => this.enhanceVideo(video));
  }

  // 获取或生成视频的唯一 ID
  private getVideoId(video: HTMLVideoElement): string {
    let id = video.dataset.vcId;
    if (!id) {
      id = `vc-video-${++this.videoIdCounter}`;
      video.dataset.vcId = id;
    }
    return id;
  }

  // 标记某个视频的面板为已关闭
  markPanelClosed(video: HTMLVideoElement): void {
    const id = this.getVideoId(video);
    this.closedPanels.add(id);
  }

  // 检查某个视频的面板是否被关闭
  isPanelClosed(video: HTMLVideoElement): boolean {
    const id = this.getVideoId(video);
    return this.closedPanels.has(id);
  }

  start(): void {
    this.scanner.start();
  }

  stop(): void {
    this.scanner.stop();
    this.panels.forEach((panel) => panel.destroy());
    this.panels.clear();
    this.contextMenus.forEach((menu) => menu.destroy());
    this.contextMenus.clear();
  }

  updateSettings(settings: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.applySettings();
  }

  private enhanceVideo(video: HTMLVideoElement): void {
    // 为视频生成 ID
    this.getVideoId(video);

    // 检测是否有自定义控制器
    const hasCustom = hasCustomControls(video);

    // 如果有自定义控制器，只创建右键菜单，不显示控制面板
    if (hasCustom) {
      const contextMenu = new ContextMenu(video);
      this.contextMenus.set(video, contextMenu);

      video.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        contextMenu.show(e.clientX, e.clientY);
      });
      return;
    }

    // 创建控制面板（只有原生视频才创建）
    const panel = new ControlPanel({
      video,
      autoHide: this.settings.autoHidePanel,
      hideDelay: this.settings.autoHideDelay,
      onClose: () => this.markPanelClosed(video),
    });

    this.panels.set(video, panel);

    // 创建右键菜单，传递面板控制选项
    const contextMenu = new ContextMenu(video, {
      onShowPanel: () => this.togglePanel(video),
      isPanelVisible: () => this.isPanelVisible(video),
    });
    this.contextMenus.set(video, contextMenu);

    // 设置右键菜单事件
    video.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      contextMenu.show(e.clientX, e.clientY);
    });

    // 添加到视频父元素
    if (video.parentElement) {
      video.parentElement.style.position = 'relative';
      video.parentElement.appendChild(panel.getElement());
    }

    // 检查是否被用户手动关闭过，如果是则不显示
    if (this.isPanelClosed(video)) {
      panel.getElement().style.display = 'none';
    } else {
      // 初始显示面板（autoHide 会在一段时间后自动隐藏）
      panel.show();
    }

    // 应用默认速度
    if (this.settings.defaultSpeed !== 1) {
      video.playbackRate = this.settings.defaultSpeed;
      panel.updateSpeedDisplay(this.settings.defaultSpeed);
    }
  }

  private applySettings(): void {
    this.panels.forEach((panel, video) => {
      if (!this.settings.showPanel) {
        panel.getElement().style.display = 'none';
      } else {
        panel.getElement().style.display = '';
      }

      if (this.settings.defaultSpeed !== video.playbackRate) {
        video.playbackRate = this.settings.defaultSpeed;
        panel.updateSpeedDisplay(this.settings.defaultSpeed);
      }
    });
  }

  getPanel(video: HTMLVideoElement): ControlPanel | undefined {
    return this.panels.get(video);
  }

  // 切换面板显示状态
  private togglePanel(video: HTMLVideoElement): void {
    const panel = this.panels.get(video);
    if (!panel) return;

    const element = panel.getElement();
    const isHidden = element.style.display === 'none';

    if (isHidden) {
      // 显示面板，并从关闭列表中移除
      element.style.display = '';
      panel.show();
      const id = this.getVideoId(video);
      this.closedPanels.delete(id);
    } else {
      // 隐藏面板
      element.style.display = 'none';
      this.markPanelClosed(video);
    }
  }

  // 检查面板是否可见
  private isPanelVisible(video: HTMLVideoElement): boolean {
    const panel = this.panels.get(video);
    if (!panel) return false;
    return panel.getElement().style.display !== 'none';
  }

  getAllPanels(): ControlPanel[] {
    return Array.from(this.panels.values());
  }

  getFirstVideo(): HTMLVideoElement | undefined {
    return this.panels.keys().next().value;
  }

  toggleAllPanels(): void {
    this.panels.forEach((panel) => {
      const element = panel.getElement();
      element.classList.toggle('vc-visible');
    });
  }
}

// 单例实例
export const videoEnhancer = new VideoEnhancer();
