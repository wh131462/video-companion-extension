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

  constructor() {
    this.scanner = new VideoScanner((video) => this.enhanceVideo(video));
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
    // 创建控制面板
    const panel = new ControlPanel({
      video,
      autoHide: this.settings.autoHidePanel,
      hideDelay: this.settings.autoHideDelay,
    });

    this.panels.set(video, panel);

    // 添加到视频父元素
    if (video.parentElement) {
      video.parentElement.style.position = 'relative';
      video.parentElement.appendChild(panel.getElement());
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
