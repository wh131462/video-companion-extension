/**
 * 隐藏视频原生控制器功能
 */

import type { VideoFeature } from '@shared/types';

// 存储视频原始 controls 属性状态
const originalControlsState = new WeakMap<HTMLVideoElement, boolean>();

export class HideControlsFeature implements VideoFeature {
  name = 'hideControls';

  execute(video: HTMLVideoElement): void {
    this.toggle(video);
  }

  toggle(video: HTMLVideoElement): boolean {
    // 首次操作时保存原始状态
    if (!originalControlsState.has(video)) {
      originalControlsState.set(video, video.controls);
    }

    // 切换 controls 属性
    video.controls = !video.controls;
    return !video.controls; // 返回是否已隐藏
  }

  hide(video: HTMLVideoElement): void {
    if (!originalControlsState.has(video)) {
      originalControlsState.set(video, video.controls);
    }
    video.controls = false;
  }

  show(video: HTMLVideoElement): void {
    video.controls = true;
  }

  restore(video: HTMLVideoElement): void {
    const original = originalControlsState.get(video);
    if (original !== undefined) {
      video.controls = original;
    }
  }

  isHidden(video: HTMLVideoElement): boolean {
    return !video.controls;
  }
}

export const hideControls = new HideControlsFeature();
