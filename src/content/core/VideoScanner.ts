/**
 * 视频扫描器
 */

import { MIN_VIDEO_SIZE, SCAN_INTERVAL } from '@shared/constants';

export type VideoCallback = (video: HTMLVideoElement) => void;

export class VideoScanner {
  private processedVideos = new WeakSet<HTMLVideoElement>();
  private observer: MutationObserver | null = null;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private onVideoFound: VideoCallback;

  constructor(onVideoFound: VideoCallback) {
    this.onVideoFound = onVideoFound;
  }

  start(): void {
    // 初始扫描
    this.scan();

    // 监听 DOM 变化
    this.observeDOM();

    // 定期扫描（处理延迟加载的视频）
    this.scanInterval = setInterval(() => this.scan(), SCAN_INTERVAL);
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  scan(): void {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => this.processVideo(video as HTMLVideoElement));
  }

  private processVideo(video: HTMLVideoElement): void {
    // 跳过已处理的视频
    if (this.processedVideos.has(video)) return;

    // 跳过太小的视频（可能是广告或图标）
    if (video.offsetWidth < MIN_VIDEO_SIZE.width ||
        video.offsetHeight < MIN_VIDEO_SIZE.height) {
      return;
    }

    this.processedVideos.add(video);
    this.onVideoFound(video);
  }

  private observeDOM(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const element = node as HTMLElement;

          if (element.tagName === 'VIDEO') {
            // 延迟处理，确保视频元素完全加载
            setTimeout(() => this.processVideo(element as HTMLVideoElement), 500);
          } else {
            // 检查子元素中的视频
            const videos = element.querySelectorAll?.('video');
            videos?.forEach((v) => {
              setTimeout(() => this.processVideo(v as HTMLVideoElement), 500);
            });
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  isProcessed(video: HTMLVideoElement): boolean {
    return this.processedVideos.has(video);
  }
}
