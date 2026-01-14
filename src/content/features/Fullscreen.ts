/**
 * 全屏功能
 */

import type { VideoFeature } from '@shared/types';
import { CSS_CLASSES } from '@shared/constants';
import { findVideoContainer } from '@shared/utils';

export class FullscreenFeature implements VideoFeature {
  name = 'fullscreen';

  async execute(video: HTMLVideoElement): Promise<void> {
    await this.toggle(video);
  }

  async toggle(video: HTMLVideoElement): Promise<boolean> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return false;
      } else {
        const container = findVideoContainer(video);
        await container.requestFullscreen();
        return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new Error(`全屏切换失败: ${message}`);
    }
  }

  isActive(): boolean {
    return !!document.fullscreenElement;
  }
}

export class WebFullscreenFeature implements VideoFeature {
  name = 'web-fullscreen';

  execute(video: HTMLVideoElement): void {
    this.toggle(video);
  }

  toggle(video: HTMLVideoElement): boolean {
    const container = findVideoContainer(video);

    if (container.classList.contains(CSS_CLASSES.webFullscreen)) {
      container.classList.remove(CSS_CLASSES.webFullscreen);
      document.body.classList.remove(CSS_CLASSES.bodyFullscreen);
      return false;
    } else {
      container.classList.add(CSS_CLASSES.webFullscreen);
      document.body.classList.add(CSS_CLASSES.bodyFullscreen);
      return true;
    }
  }

  isActive(video: HTMLVideoElement): boolean {
    const container = findVideoContainer(video);
    return container.classList.contains(CSS_CLASSES.webFullscreen);
  }
}

export const fullscreen = new FullscreenFeature();
export const webFullscreen = new WebFullscreenFeature();
