/**
 * 播放速度控制
 */

import type { VideoFeature } from '@shared/types';
import { SPEED_STEP } from '@shared/constants';
import { clampSpeed, formatSpeed } from '@shared/utils';

export class PlaybackSpeedFeature implements VideoFeature {
  name = 'playback-speed';

  execute(video: HTMLVideoElement): void {
    // 默认设置为 1x
    this.setSpeed(video, 1);
  }

  setSpeed(video: HTMLVideoElement, speed: number): number {
    const clampedSpeed = clampSpeed(speed);
    video.playbackRate = clampedSpeed;
    return clampedSpeed;
  }

  getSpeed(video: HTMLVideoElement): number {
    return video.playbackRate;
  }

  increaseSpeed(video: HTMLVideoElement, step: number = SPEED_STEP): number {
    const newSpeed = this.getSpeed(video) + step;
    return this.setSpeed(video, newSpeed);
  }

  decreaseSpeed(video: HTMLVideoElement, step: number = SPEED_STEP): number {
    const newSpeed = this.getSpeed(video) - step;
    return this.setSpeed(video, newSpeed);
  }

  formatSpeed(speed: number): string {
    return formatSpeed(speed);
  }
}

export const playbackSpeed = new PlaybackSpeedFeature();
