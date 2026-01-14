/**
 * 视频截图功能
 */

import type { VideoFeature } from '@shared/types';
import { generateFileName } from '@shared/utils';

export class ScreenshotFeature implements VideoFeature {
  name = 'screenshot';

  execute(video: HTMLVideoElement): void {
    this.capture(video);
  }

  capture(video: HTMLVideoElement): void {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建 Canvas 上下文');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('无法生成图片');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = generateFileName('screenshot', 'png');
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      const message = error instanceof Error ? error.message : '可能存在跨域限制';
      throw new Error(`截图失败: ${message}`);
    }
  }

  captureAsDataURL(video: HTMLVideoElement, format: string = 'image/png'): string {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文');
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(format);
  }
}

export const screenshot = new ScreenshotFeature();
