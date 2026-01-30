/**
 * 视频增强器主类
 */

import type { UserSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { ControlPanel } from '../ui/ControlPanel';
import { VideoScanner } from './VideoScanner';

export class VideoEnhancer {
  private scanner: VideoScanner;
  private panels = new Map<HTMLVideoElement, ControlPanel>();
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
  }

  updateSettings(settings: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.applySettings();
  }

  private enhanceVideo(video: HTMLVideoElement): void {
    // 为视频生成 ID
    this.getVideoId(video);

    // 创建控制面板
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
