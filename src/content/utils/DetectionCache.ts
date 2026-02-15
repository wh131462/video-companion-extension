/**
 * 检测结果缓存
 * 使用 WeakMap 存储，支持自动失效
 */

import type { DetectionResult, CacheEntry } from '@shared/types';
import { DETECTION_CACHE_TTL } from '@shared/constants';
import { debounce } from '../core/ErrorBoundary';

interface DetectionCacheEntry extends CacheEntry<DetectionResult> {
  container: WeakRef<HTMLElement>;
}

export class DetectionCache {
  private cache = new WeakMap<HTMLVideoElement, DetectionCacheEntry>();
  private observers = new WeakMap<HTMLVideoElement, MutationObserver>();
  private ttl: number;

  constructor(ttl: number = DETECTION_CACHE_TTL) {
    this.ttl = ttl;
  }

  /**
   * 获取缓存的检测结果
   */
  get(video: HTMLVideoElement): DetectionResult | null {
    const entry = this.cache.get(video);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.invalidate(video);
      return null;
    }

    // 检查容器是否仍然存在
    const container = entry.container.deref();
    if (!container || !document.contains(container)) {
      this.invalidate(video);
      return null;
    }

    // 检查容器快照是否变化
    const currentSnapshot = this.snapshotContainer(container);
    if (currentSnapshot !== entry.containerSnapshot) {
      this.invalidate(video);
      return null;
    }

    return entry.result;
  }

  /**
   * 设置缓存
   */
  set(
    video: HTMLVideoElement,
    result: DetectionResult,
    container: HTMLElement
  ): void {
    // 清理旧的观察器
    this.cleanupObserver(video);

    // 创建新的观察器监听容器变化
    const debouncedInvalidate = debounce(() => this.invalidate(video), 100);
    const observer = new MutationObserver(debouncedInvalidate);

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    this.observers.set(video, observer);
    this.cache.set(video, {
      result,
      timestamp: Date.now(),
      containerSnapshot: this.snapshotContainer(container),
      container: new WeakRef(container),
    });
  }

  /**
   * 使缓存失效
   */
  invalidate(video: HTMLVideoElement): void {
    this.cleanupObserver(video);
    this.cache.delete(video);
  }

  /**
   * 检查是否有缓存
   */
  has(video: HTMLVideoElement): boolean {
    return this.get(video) !== null;
  }

  /**
   * 清理观察器
   */
  private cleanupObserver(video: HTMLVideoElement): void {
    const observer = this.observers.get(video);
    if (observer) {
      observer.disconnect();
      this.observers.delete(video);
    }
  }

  /**
   * 生成容器快照用于变化检测
   */
  private snapshotContainer(container: HTMLElement): string {
    let className = '';
    const rawClassName = container.className;
    if (typeof rawClassName === 'string') {
      className = rawClassName;
    } else if (rawClassName && typeof rawClassName === 'object' && 'baseVal' in rawClassName) {
      // SVGAnimatedString
      className = (rawClassName as SVGAnimatedString).baseVal || '';
    }
    return `${className}:${container.childElementCount}`;
  }

  /**
   * 销毁缓存，清理所有资源
   */
  destroy(): void {
    // WeakMap 无法遍历，但观察器 WeakMap 中的项会随 video 元素 GC
    // 此方法主要用于测试或强制清理
  }
}

// 默认单例
export const detectionCache = new DetectionCache();
