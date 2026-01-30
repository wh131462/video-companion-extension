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
  private contextMenuHandlers = new Map<HTMLVideoElement, (e: MouseEvent) => void>();
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
    // 移除右键菜单事件处理器
    this.contextMenuHandlers.forEach((handler, video) => {
      video.removeEventListener('contextmenu', handler);
    });
    this.contextMenuHandlers.clear();
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
      // 只有在启用右键菜单时才创建
      if (this.settings.showContextMenu) {
        const contextMenu = new ContextMenu(video);
        this.contextMenus.set(video, contextMenu);

        const handler = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          contextMenu.show(e.clientX, e.clientY);
        };
        video.addEventListener('contextmenu', handler);
        this.contextMenuHandlers.set(video, handler);
      }
      return;
    }

    // 创建控制面板（只有原生视频且启用时才创建）
    if (this.settings.showPanel) {
      const panel = new ControlPanel({
        video,
        autoHide: this.settings.autoHidePanel,
        hideDelay: this.settings.autoHideDelay,
        onClose: () => this.markPanelClosed(video),
      });

      this.panels.set(video, panel);

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

    // 创建右键菜单（只有在启用时才创建）
    if (this.settings.showContextMenu) {
      const contextMenu = new ContextMenu(video, {
        onShowPanel: () => this.togglePanel(video),
        isPanelVisible: () => this.isPanelVisible(video),
      });
      this.contextMenus.set(video, contextMenu);

      // 设置右键菜单事件
      const handler = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        contextMenu.show(e.clientX, e.clientY);
      };
      video.addEventListener('contextmenu', handler);
      this.contextMenuHandlers.set(video, handler);
    }
  }

  private applySettings(): void {
    // 应用控制面板设置
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

    // 应用右键菜单设置
    if (!this.settings.showContextMenu) {
      // 隐藏所有右键菜单并移除事件处理器
      this.contextMenus.forEach((menu) => {
        menu.hide();
      });
      this.contextMenuHandlers.forEach((handler, video) => {
        video.removeEventListener('contextmenu', handler);
      });
      this.contextMenuHandlers.clear();
    } else {
      // 重新添加右键菜单事件处理器（如果还没有）
      this.contextMenus.forEach((menu, video) => {
        if (!this.contextMenuHandlers.has(video)) {
          const handler = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            menu.show(e.clientX, e.clientY);
          };
          video.addEventListener('contextmenu', handler);
          this.contextMenuHandlers.set(video, handler);
        }
      });
    }
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
