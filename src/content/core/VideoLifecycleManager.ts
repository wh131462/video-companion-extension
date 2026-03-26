/**
 * 视频生命周期管理器
 * 统一管理视频元素的添加、移除、替换和尺寸变化
 */

import type { VideoLifecycleEvents } from '@shared/types';
import {
  MIN_VIDEO_SIZE,
  SCAN_INTERVAL,
  VIDEO_READY_MAX_ATTEMPTS,
  VIDEO_READY_BASE_DELAY,
} from '@shared/constants';

export class VideoLifecycleManager {
  private observer: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private trackedVideos = new WeakSet<HTMLVideoElement>();
  private containerToVideo = new WeakMap<HTMLElement, HTMLVideoElement>();
  private pendingVideos = new Map<HTMLVideoElement, number>(); // video -> timeoutId
  private events: VideoLifecycleEvents;

  constructor(events: VideoLifecycleEvents) {
    this.events = events;
  }

  /**
   * 启动生命周期管理
   */
  start(): void {
    this.setupMutationObserver();
    this.setupResizeObserver();
    this.initialScan();

    // 定期重扫描：兜底处理初始扫描时尺寸不足或延迟加载的视频
    this.scanInterval = setInterval(() => this.initialScan(), SCAN_INTERVAL);
  }

  /**
   * 停止生命周期管理
   */
  stop(): void {
    // 断开 MutationObserver
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // 断开 ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 清理定期扫描
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    // 清理待处理的超时
    for (const timeoutId of this.pendingVideos.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingVideos.clear();

    // 重置跟踪状态
    this.trackedVideos = new WeakSet();
    this.containerToVideo = new WeakMap();
  }

  /**
   * 初始扫描页面上的所有视频
   */
  private initialScan(): void {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      this.handleVideoCandidate(video as HTMLVideoElement);
    });
  }

  /**
   * 设置 DOM 变化观察器
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // 处理添加的节点
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const element = node as HTMLElement;

          if (element.tagName === 'VIDEO') {
            this.handleVideoCandidate(element as HTMLVideoElement);
          } else {
            // 检查子元素中的视频
            const videos = element.querySelectorAll('video');
            videos.forEach((v) => {
              this.handleVideoCandidate(v as HTMLVideoElement);
            });
          }
        }

        // 处理移除的节点
        for (const node of mutation.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const element = node as HTMLElement;

          if (element.tagName === 'VIDEO') {
            this.handleVideoRemoved(element as HTMLVideoElement);
          } else {
            // 检查子元素中的视频
            const videos = element.querySelectorAll('video');
            videos.forEach((v) => {
              this.handleVideoRemoved(v as HTMLVideoElement);
            });
          }
        }
      }
    });

    const observeTarget = document.body || document.documentElement;
    this.observer.observe(observeTarget, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * 设置尺寸变化观察器
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (video.tagName === 'VIDEO' && this.trackedVideos.has(video)) {
          this.events.onVideoResized?.(video);
        }
      }
    });
  }

  /**
   * 处理候选视频元素
   */
  private handleVideoCandidate(video: HTMLVideoElement): void {
    // 已经在跟踪中则跳过
    if (this.trackedVideos.has(video)) return;

    // 取消之前的待处理超时
    const existingTimeout = this.pendingVideos.get(video);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 等待视频就绪
    this.waitForVideoReady(video, 0);
  }

  /**
   * 等待视频就绪（有尺寸或元数据）
   */
  private waitForVideoReady(video: HTMLVideoElement, attempt: number): void {
    if (this.isVideoReady(video)) {
      this.pendingVideos.delete(video);
      this.processVideo(video);
      return;
    }

    // 达到最大尝试次数
    if (attempt >= VIDEO_READY_MAX_ATTEMPTS) {
      this.pendingVideos.delete(video);
      // 即使未就绪也处理，可能是懒加载视频
      if (document.contains(video)) {
        this.processVideo(video);
      }
      return;
    }

    // 指数退避重试
    const delay = VIDEO_READY_BASE_DELAY * Math.pow(2, attempt);
    const timeoutId = setTimeout(() => {
      this.waitForVideoReady(video, attempt + 1);
    }, delay);
    this.pendingVideos.set(video, timeoutId as unknown as number);
  }

  /**
   * 检查视频是否就绪
   */
  private isVideoReady(video: HTMLVideoElement): boolean {
    // 有足够尺寸
    const hasSize =
      video.offsetWidth >= MIN_VIDEO_SIZE.width &&
      video.offsetHeight >= MIN_VIDEO_SIZE.height;

    // 或者有元数据
    const hasMetadata = video.readyState >= 1;

    return hasSize || hasMetadata;
  }

  /**
   * 处理确认的视频元素
   */
  private processVideo(video: HTMLVideoElement): void {
    // 再次检查是否已跟踪
    if (this.trackedVideos.has(video)) return;

    // 检查尺寸是否满足最小要求
    const hasMinSize =
      video.offsetWidth >= MIN_VIDEO_SIZE.width &&
      video.offsetHeight >= MIN_VIDEO_SIZE.height;

    if (!hasMinSize) {
      // 有明确视频源的元素放宽限制（如 HLS 流等加载较慢的场景）
      const hasSource = !!(video.src || video.currentSrc || video.querySelector('source'));
      if (!hasSource) {
        return;
      }
    }

    const container = video.parentElement;

    // 检查是否是替换场景
    if (container && this.containerToVideo.has(container)) {
      const oldVideo = this.containerToVideo.get(container)!;
      if (oldVideo !== video && !document.contains(oldVideo)) {
        // 旧视频已不在 DOM 中，这是替换
        this.trackedVideos.delete(oldVideo);
        this.resizeObserver?.unobserve(oldVideo);
        this.events.onVideoReplaced?.(oldVideo, video, container);
      }
    }

    // 开始跟踪
    this.trackedVideos.add(video);
    if (container) {
      this.containerToVideo.set(container, video);
    }

    // 观察尺寸变化
    this.resizeObserver?.observe(video);

    // 触发添加事件
    this.events.onVideoAdded(video);
  }

  /**
   * 处理视频移除
   */
  private handleVideoRemoved(video: HTMLVideoElement): void {
    // 清理待处理超时
    const timeoutId = this.pendingVideos.get(video);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingVideos.delete(video);
    }

    // 未跟踪则跳过
    if (!this.trackedVideos.has(video)) return;

    // 停止跟踪
    this.trackedVideos.delete(video);
    this.resizeObserver?.unobserve(video);

    // 触发移除事件
    this.events.onVideoRemoved(video);
  }

  /**
   * 手动触发重新扫描
   */
  rescan(): void {
    this.initialScan();
  }

  /**
   * 检查视频是否正在跟踪
   */
  isTracking(video: HTMLVideoElement): boolean {
    return this.trackedVideos.has(video);
  }
}
