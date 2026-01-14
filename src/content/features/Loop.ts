/**
 * 循环播放功能
 */

import type { VideoFeature } from '@shared/types';

export class LoopFeature implements VideoFeature {
  name = 'loop';

  execute(video: HTMLVideoElement): void {
    this.toggle(video);
  }

  toggle(video: HTMLVideoElement): boolean {
    video.loop = !video.loop;
    return video.loop;
  }

  enable(video: HTMLVideoElement): void {
    video.loop = true;
  }

  disable(video: HTMLVideoElement): void {
    video.loop = false;
  }

  isActive(video: HTMLVideoElement): boolean {
    return video.loop;
  }
}

export const loop = new LoopFeature();
