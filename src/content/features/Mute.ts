/**
 * 静音控制功能
 */

import type { VideoFeature } from '@shared/types';

export class MuteFeature implements VideoFeature {
  name = 'mute';

  execute(video: HTMLVideoElement): void {
    this.toggle(video);
  }

  toggle(video: HTMLVideoElement): boolean {
    video.muted = !video.muted;
    return video.muted;
  }

  mute(video: HTMLVideoElement): void {
    video.muted = true;
  }

  unmute(video: HTMLVideoElement): void {
    video.muted = false;
  }

  isActive(video: HTMLVideoElement): boolean {
    return video.muted;
  }

  getIcon(video: HTMLVideoElement): string {
    return video.muted ? '🔇' : '🔊';
  }
}

export const mute = new MuteFeature();
