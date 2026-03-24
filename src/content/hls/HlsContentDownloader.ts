/**
 * HLS 下载器（Content Script 端）
 * 在页面上下文中运行，可使用 URL.createObjectURL 触发下载
 */

import { HLS_DOWNLOAD_CONCURRENCY, HLS_SEGMENT_TIMEOUT } from '@shared/constants';
import { showToast } from '../ui/Toast';
import { generateFileName } from '@shared/utils';
import { transmuxTsToMp4 } from './transmux';

export type DownloadState =
  | { status: 'downloading'; percent: number }
  | { status: 'done' }
  | { status: 'error'; message: string };

export type DownloadListener = (state: DownloadState) => void;

interface M3u8Segment {
  url: string;
  duration: number;
}

interface M3u8Variant {
  url: string;
  bandwidth: number;
}

export class HlsContentDownloader {
  private abortController: AbortController | null = null;
  private listeners = new Set<DownloadListener>();

  onStateChange(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(state: DownloadState): void {
    this.listeners.forEach((fn) => fn(state));
  }

  async download(m3u8Url: string): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      showToast('正在解析 m3u8...');

      // 1. 获取并解析 m3u8
      const m3u8Text = await this.fetchText(m3u8Url, signal);
      let { segments, variants, mapUrl } = this.parseM3u8(m3u8Text, m3u8Url);

      // 2. 如果是 master playlist，选最高码率
      if (variants.length > 0) {
        const best = variants.sort((a, b) => b.bandwidth - a.bandwidth)[0]!;
        const variantText = await this.fetchText(best.url, signal);
        const parsed = this.parseM3u8(variantText, best.url);
        segments = parsed.segments;
        mapUrl = parsed.mapUrl;
      }

      if (segments.length === 0) {
        throw new Error('m3u8 中未找到任何视频分段');
      }

      showToast(`开始下载 ${segments.length} 个分段...`);

      // 3. 如果有 init segment（fMP4 格式），先下载
      let initSegment: ArrayBuffer | null = null;
      if (mapUrl) {
        initSegment = await this.fetchArrayBuffer(mapUrl, signal);
      }

      // 4. 并发下载所有分段
      const chunks: ArrayBuffer[] = new Array(segments.length);
      let completed = 0;

      await this.downloadSegments(segments, chunks, signal, () => {
        completed++;
        const percent = Math.round((completed / segments.length) * 100);
        this.notify({ status: 'downloading', percent });
        if (percent % 10 === 0 || completed === segments.length) {
          showToast(`HLS 下载中: ${percent}%`);
        }
      });

      // 5. init segment 放在最前面
      if (initSegment) {
        chunks.unshift(initSegment);
      }

      // 6. 转封装 TS → MP4 并触发浏览器下载
      showToast('正在转封装为 MP4...');
      const blob = await transmuxTsToMp4(chunks);
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = generateFileName('video', 'mp4');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      showToast('HLS 视频下载完成');
      this.notify({ status: 'done' });
    } catch (error) {
      if (signal.aborted) {
        showToast('下载已取消');
        this.notify({ status: 'error', message: '下载已取消' });
      } else {
        const message = error instanceof Error ? error.message : 'HLS 下载失败';
        showToast(message);
        this.notify({ status: 'error', message });
      }
    } finally {
      this.abortController = null;
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  private async fetchText(url: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(url, { signal, headers: { 'X-VC-Internal': '1' } });
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${url}`);
    }
    return response.text();
  }

  private async fetchArrayBuffer(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
    const response = await fetch(url, { signal, headers: { 'X-VC-Internal': '1' } });
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${url}`);
    }
    return response.arrayBuffer();
  }

  private parseM3u8(
    content: string,
    baseUrl: string
  ): { segments: M3u8Segment[]; variants: M3u8Variant[]; mapUrl?: string } {
    const lines = content.split('\n').map((l) => l.trim());
    const variants: M3u8Variant[] = [];
    const segments: M3u8Segment[] = [];
    let segmentDuration = 0;
    let mapUrl: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      if (line.startsWith('#EXT-X-MAP:')) {
        const uriMatch = line.match(/URI="([^"]+)"/);
        if (uriMatch) {
          mapUrl = this.resolveUrl(baseUrl, uriMatch[1]!);
        }
      } else if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const bwMatch = line.match(/BANDWIDTH=(\d+)/);
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          variants.push({
            url: this.resolveUrl(baseUrl, nextLine),
            bandwidth: bwMatch ? parseInt(bwMatch[1]!, 10) : 0,
          });
          i++;
        }
      } else if (line.startsWith('#EXTINF:')) {
        const durMatch = line.match(/#EXTINF:([\d.]+)/);
        segmentDuration = durMatch ? parseFloat(durMatch[1]!) : 0;
      } else if (line && !line.startsWith('#') && segmentDuration > 0) {
        segments.push({
          url: this.resolveUrl(baseUrl, line),
          duration: segmentDuration,
        });
        segmentDuration = 0;
      }
    }

    return { segments, variants, mapUrl };
  }

  private resolveUrl(baseUrl: string, relativeUrl: string): string {
    if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      return base + relativeUrl;
    }
  }

  private async downloadSegments(
    segments: M3u8Segment[],
    chunks: ArrayBuffer[],
    signal: AbortSignal,
    onSegmentDone: () => void
  ): Promise<void> {
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < segments.length) {
        if (signal.aborted) throw new Error('下载已取消');

        const idx = nextIndex++;
        const segment = segments[idx]!;

        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          HLS_SEGMENT_TIMEOUT
        );

        const onAbort = () => controller.abort();
        signal.addEventListener('abort', onAbort, { once: true });

        try {
          const response = await fetch(segment.url, {
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`分段 ${idx} 下载失败: ${response.status}`);
          }
          chunks[idx] = await response.arrayBuffer();
          onSegmentDone();
        } finally {
          clearTimeout(timeout);
          signal.removeEventListener('abort', onAbort);
        }
      }
    };

    const concurrency = Math.min(HLS_DOWNLOAD_CONCURRENCY, segments.length);
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }
}

export const hlsContentDownloader = new HlsContentDownloader();
