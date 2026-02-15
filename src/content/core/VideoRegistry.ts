/**
 * 视频注册表
 * 集中管理所有视频相关状态，使用 WeakMap 避免内存泄漏
 */

import type { ContainerScore, DetectionResult } from '@shared/types';
import type { ControlPanel } from '../ui/ControlPanel';
import type { ContextMenu } from '../ui/ContextMenu';

/**
 * 单个视频的完整状态
 */
export interface VideoState {
  id: string;
  container: HTMLElement;
  containerScore: ContainerScore;
  hasCustomControls: boolean;
  detectionConfidence: 'high' | 'medium' | 'low';
  detectedBy: string;
  panel?: ControlPanel;
  contextMenu?: ContextMenu;
  eventHandler?: (e: MouseEvent) => void;
  isPanelClosed: boolean;
  lastDetectionTime: number;
  playerType?: string; // 检测到的播放器类型
}

/**
 * 视频注册表 - 单一数据源
 */
export class VideoRegistry {
  private states = new WeakMap<HTMLVideoElement, VideoState>();
  private idToVideo = new Map<string, WeakRef<HTMLVideoElement>>();
  private cleanupRegistry: FinalizationRegistry<string>;
  private idCounter = 0;

  /**
   * 视频被 GC 回收时的回调
   */
  onVideoCollected?: (id: string) => void;

  constructor() {
    // 使用 FinalizationRegistry 在视频元素被 GC 时自动清理
    this.cleanupRegistry = new FinalizationRegistry<string>((id) => {
      this.idToVideo.delete(id);
      this.onVideoCollected?.(id);
    });
  }

  /**
   * 注册视频并返回初始状态
   */
  register(video: HTMLVideoElement, container: HTMLElement): VideoState {
    // 检查是否已注册
    const existing = this.states.get(video);
    if (existing) {
      return existing;
    }

    const id = `vc-video-${++this.idCounter}`;
    const state: VideoState = {
      id,
      container,
      containerScore: {
        element: container,
        score: 0,
        reasons: [],
        verified: true,
      },
      hasCustomControls: false,
      detectionConfidence: 'low',
      detectedBy: 'none',
      isPanelClosed: false,
      lastDetectionTime: 0,
    };

    this.states.set(video, state);
    this.idToVideo.set(id, new WeakRef(video));
    this.cleanupRegistry.register(video, id);

    // 将 ID 存储到视频元素的 dataset
    video.dataset.vcId = id;

    return state;
  }

  /**
   * 获取视频状态
   */
  get(video: HTMLVideoElement): VideoState | undefined {
    return this.states.get(video);
  }

  /**
   * 通过 ID 获取视频元素
   */
  getById(id: string): HTMLVideoElement | undefined {
    return this.idToVideo.get(id)?.deref();
  }

  /**
   * 更新视频状态
   */
  update(video: HTMLVideoElement, updates: Partial<VideoState>): void {
    const state = this.states.get(video);
    if (state) {
      Object.assign(state, updates);
    }
  }

  /**
   * 更新检测结果
   */
  updateDetection(
    video: HTMLVideoElement,
    result: DetectionResult,
    containerScore: ContainerScore
  ): void {
    const state = this.states.get(video);
    if (state) {
      state.hasCustomControls = result.hasCustomControls;
      state.detectionConfidence = result.confidence;
      state.detectedBy = result.detectedBy;
      state.containerScore = containerScore;
      state.container = containerScore.element;
      state.lastDetectionTime = Date.now();
    }
  }

  /**
   * 设置 UI 组件
   */
  setUI(
    video: HTMLVideoElement,
    panel?: ControlPanel,
    contextMenu?: ContextMenu,
    eventHandler?: (e: MouseEvent) => void
  ): void {
    const state = this.states.get(video);
    if (state) {
      state.panel = panel;
      state.contextMenu = contextMenu;
      state.eventHandler = eventHandler;
    }
  }

  /**
   * 标记面板为已关闭
   */
  markPanelClosed(video: HTMLVideoElement): void {
    const state = this.states.get(video);
    if (state) {
      state.isPanelClosed = true;
    }
  }

  /**
   * 标记面板为已打开
   */
  markPanelOpened(video: HTMLVideoElement): void {
    const state = this.states.get(video);
    if (state) {
      state.isPanelClosed = false;
    }
  }

  /**
   * 检查视频是否已注册
   */
  has(video: HTMLVideoElement): boolean {
    return this.states.has(video);
  }

  /**
   * 注销视频
   */
  unregister(video: HTMLVideoElement): void {
    const state = this.states.get(video);
    if (state) {
      this.idToVideo.delete(state.id);
      this.states.delete(video);
      delete video.dataset.vcId;
    }
  }

  /**
   * 获取所有已注册视频的 ID
   */
  getAllIds(): string[] {
    return Array.from(this.idToVideo.keys());
  }

  /**
   * 获取已注册视频数量（近似值，因为 WeakRef 可能已失效）
   */
  getCount(): number {
    return this.idToVideo.size;
  }

  /**
   * 获取第一个有效的视频
   */
  getFirstVideo(): HTMLVideoElement | undefined {
    for (const [, weakRef] of this.idToVideo) {
      const video = weakRef.deref();
      if (video && document.contains(video)) {
        return video;
      }
    }
    return undefined;
  }

  /**
   * 遍历所有有效视频
   */
  forEach(callback: (video: HTMLVideoElement, state: VideoState) => void): void {
    for (const [id, weakRef] of this.idToVideo) {
      const video = weakRef.deref();
      if (video && document.contains(video)) {
        const state = this.states.get(video);
        if (state) {
          callback(video, state);
        }
      } else {
        // 清理无效引用
        this.idToVideo.delete(id);
      }
    }
  }

  /**
   * 清理所有无效引用
   */
  cleanup(): void {
    const toDelete: string[] = [];
    for (const [id, weakRef] of this.idToVideo) {
      const video = weakRef.deref();
      if (!video || !document.contains(video)) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.idToVideo.delete(id);
    }
  }
}

// 默认单例
export const videoRegistry = new VideoRegistry();
