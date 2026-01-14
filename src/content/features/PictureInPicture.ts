/**
 * 画中画功能
 */

import type { VideoFeature } from '@shared/types';

export class PictureInPictureFeature implements VideoFeature {
  name = 'picture-in-picture';

  async execute(video: HTMLVideoElement): Promise<void> {
    await this.toggle(video);
  }

  async toggle(video: HTMLVideoElement): Promise<boolean> {
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
        return false;
      } else {
        await video.requestPictureInPicture();
        return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new Error(`画中画切换失败: ${message}`);
    }
  }

  isActive(video: HTMLVideoElement): boolean {
    return document.pictureInPictureElement === video;
  }

  isSupported(): boolean {
    return 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
  }
}

export const pictureInPicture = new PictureInPictureFeature();
