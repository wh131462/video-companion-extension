/**
 * HLS 播放功能模块
 * 使用 hls.js 动态加载 m3u8 流
 */

import type { VideoFeature } from '@shared/types';

export class HlsPlayerFeature implements VideoFeature {
  name = 'hlsPlayer';
  private hlsInstance: import('hls.js').default | null = null;
  private currentUrl: string | null = null;

  execute(_video: HTMLVideoElement): void {
    // 占位：由 loadM3u8 主动调用
  }

  /**
   * 为 video 元素加载 m3u8 URL
   */
  async loadM3u8(video: HTMLVideoElement, m3u8Url: string): Promise<void> {
    const { default: Hls } = await import('hls.js');

    if (!Hls.isSupported()) {
      // Safari 原生支持 HLS
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = m3u8Url;
        this.currentUrl = m3u8Url;
        return;
      }
      throw new Error('当前浏览器不支持 HLS 播放');
    }

    this.destroyHls();
    this.hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });
    this.currentUrl = m3u8Url;

    this.hlsInstance.loadSource(m3u8Url);
    this.hlsInstance.attachMedia(video);

    return new Promise<void>((resolve, reject) => {
      this.hlsInstance!.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(resolve).catch(() => resolve());
      });
      this.hlsInstance!.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          reject(new Error(`HLS 加载失败: ${data.details}`));
        }
      });
    });
  }

  getM3u8Url(): string | null {
    return this.currentUrl;
  }

  destroyHls(): void {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
      this.currentUrl = null;
    }
  }
}

export const hlsPlayer = new HlsPlayerFeature();
