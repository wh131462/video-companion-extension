/**
 * m3u8 源收集器
 * 监听来自主世界脚本的 m3u8 URL 检测消息，去重存储
 * 仅在顶层 frame 中工作，避免 iframe 导致重复收集
 */

import type { M3u8Source } from '@shared/types';

const MESSAGE_TYPE = 'VC_M3U8_DETECTED';

export type M3u8SourceListener = (sources: M3u8Source[]) => void;

export class M3u8SourceCollector {
  private sources: M3u8Source[] = [];
  private listeners: M3u8SourceListener[] = [];
  private urlSet = new Set<string>();

  constructor() {
    // 只在顶层 frame 监听，避免 all_frames: true 导致多个实例重复收集
    if (window !== window.top) return;

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data?.type !== MESSAGE_TYPE) return;
      const url = event.data.url as string;
      if (!url) return;

      this.addSource({
        url,
        pageUrl: location.href,
        timestamp: Date.now(),
        fromIntercept: true,
      });
    });
  }

  addSource(source: M3u8Source): void {
    const key = this.normalizeUrl(source.url);
    if (this.urlSet.has(key)) return;
    this.urlSet.add(key);
    this.sources.push(source);
    this.notifyListeners();
  }

  getSources(): M3u8Source[] {
    return [...this.sources];
  }

  hasSources(): boolean {
    return this.sources.length > 0;
  }

  onSourceAdded(listener: M3u8SourceListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: M3u8SourceListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }

  clear(): void {
    this.sources = [];
    this.urlSet.clear();
  }

  /** 规范化 URL，去掉常见缓存破坏参数后再去重 */
  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.searchParams.delete('_');
      u.searchParams.delete('t');
      u.searchParams.delete('timestamp');
      return u.href;
    } catch {
      return url;
    }
  }

  private notifyListeners(): void {
    const sources = this.getSources();
    this.listeners.forEach((fn) => fn(sources));
  }
}

export const m3u8SourceCollector = new M3u8SourceCollector();
