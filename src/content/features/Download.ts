/**
 * 视频下载功能
 */

import type { VideoFeature } from '@shared/types';
import { generateFileName, isValidVideoSource } from '@shared/utils';

export class DownloadFeature implements VideoFeature {
  name = 'download';

  execute(video: HTMLVideoElement): void {
    this.download(video);
  }

  download(video: HTMLVideoElement): void {
    const src = video.src || video.currentSrc;

    if (!isValidVideoSource(src)) {
      throw new Error('无法获取视频源地址或该视频类型不支持直接下载');
    }

    const link = document.createElement('a');
    link.href = src;
    link.download = generateFileName('video', 'mp4');
    link.click();
  }

  getSource(video: HTMLVideoElement): string | null {
    const src = video.src || video.currentSrc;
    return isValidVideoSource(src) ? src : null;
  }

  isDownloadable(video: HTMLVideoElement): boolean {
    return isValidVideoSource(video.src || video.currentSrc);
  }
}

export const download = new DownloadFeature();
