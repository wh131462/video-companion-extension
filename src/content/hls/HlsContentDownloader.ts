/**
 * HLS 下载器（Content Script 端）
 * 在页面上下文中运行，可使用 URL.createObjectURL 触发下载
 */

import { HLS_DOWNLOAD_CONCURRENCY, HLS_STALL_TIMEOUT } from '@shared/constants';
import { showToast } from '../ui/Toast';
import { generateFileName } from '@shared/utils';
import { transmuxTsToMp4 } from './transmux';

export type DownloadState =
  | { status: 'downloading'; percent: number; detail?: string }
  | { status: 'transmuxing' }
  | { status: 'done' }
  | { status: 'error'; message: string };

export type DownloadListener = (state: DownloadState) => void;

interface M3u8Segment {
  url: string;
  duration: number;
}

export interface M3u8Variant {
  url: string;
  bandwidth: number;
  resolution?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBandwidth(bps: number): string {
  if (bps < 1000000) return `${(bps / 1000).toFixed(0)} Kbps`;
  return `${(bps / 1000000).toFixed(1)} Mbps`;
}

export class HlsContentDownloader {
  private abortController: AbortController | null = null;
  private listeners = new Set<DownloadListener>();
  private _downloading = false;

  get isDownloading(): boolean {
    return this._downloading;
  }

  onStateChange(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(state: DownloadState): void {
    this.listeners.forEach((fn) => fn(state));
  }

  /** 获取 master playlist 的所有变体（按码率从高到低），非 master 返回空数组 */
  async getVariants(m3u8Url: string): Promise<M3u8Variant[]> {
    const text = await this.fetchText(m3u8Url, new AbortController().signal);
    const { variants } = this.parseM3u8(text, m3u8Url);
    return variants.sort((a, b) => b.bandwidth - a.bandwidth);
  }

  async download(m3u8Url: string, selectedVariant?: M3u8Variant): Promise<void> {
    if (this._downloading) {
      showToast('已有下载任务进行中');
      return;
    }
    this._downloading = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      showToast('正在解析 m3u8...');

      // 1. 获取并解析 m3u8
      const m3u8Text = await this.fetchText(m3u8Url, signal);
      let { segments, variants, mapUrl } = this.parseM3u8(m3u8Text, m3u8Url);

      // 2. 如果是 master playlist，使用指定变体或最高码率
      if (variants.length > 0) {
        const chosen = selectedVariant ?? variants.sort((a, b) => b.bandwidth - a.bandwidth)[0]!;
        const label = chosen.resolution || formatBandwidth(chosen.bandwidth);
        showToast(`下载质量: ${label}`);
        const variantText = await this.fetchText(chosen.url, signal);
        const parsed = this.parseM3u8(variantText, chosen.url);
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
      let totalBytes = 0;
      const startTime = Date.now();

      await this.downloadSegments(segments, chunks, signal, (_idx, size) => {
        completed++;
        totalBytes += size;
        const percent = Math.round((completed / segments.length) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = totalBytes / elapsed;
        const detail = `${completed}/${segments.length} · ${formatBytes(totalBytes)} · ${formatBytes(speed)}/s`;
        this.notify({ status: 'downloading', percent, detail });
        showToast(`下载中: ${percent}% (${detail})`);
      });

      // 5. init segment 放在最前面
      if (initSegment) {
        chunks.unshift(initSegment);
      }

      // 6. 转封装 TS → MP4 并触发浏览器下载
      showToast('正在转封装为 MP4，请稍候...');
      this.notify({ status: 'transmuxing' });
      const blob = await transmuxTsToMp4(chunks);
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = generateFileName('video', 'mp4');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      const totalSize = formatBytes(totalBytes);
      showToast(`下载完成 (${totalSize})`);
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
      this._downloading = false;
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
        const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          variants.push({
            url: this.resolveUrl(baseUrl, nextLine),
            bandwidth: bwMatch ? parseInt(bwMatch[1]!, 10) : 0,
            resolution: resMatch ? resMatch[1] : undefined,
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

  /**
   * 使用 ReadableStream 下载分段，基于停滞检测而非固定超时。
   * 只要数据持续到达就不中断，连续 HLS_STALL_TIMEOUT 毫秒无新数据才 abort。
   */
  private async fetchSegmentWithRetry(
    url: string,
    signal: AbortSignal
  ): Promise<ArrayBuffer> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal.addEventListener('abort', onAbort, { once: true });

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'X-VC-Internal': '1' },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // 使用 ReadableStream 逐块读取，监控数据流动
        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        let lastDataTime = Date.now();

        // 停滞检测定时器：每 5 秒检查一次是否有新数据
        const stallTimer = setInterval(() => {
          if (Date.now() - lastDataTime > HLS_STALL_TIMEOUT) {
            controller.abort();
          }
        }, 5000);

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.byteLength;
            lastDataTime = Date.now();
          }
        } finally {
          clearInterval(stallTimer);
        }

        // 合并 chunks
        const result = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return result.buffer as ArrayBuffer;
      } catch (err) {
        if (signal.aborted) throw err;
        if (attempt < MAX_RETRIES) {
          showToast(`分段下载失败，第 ${attempt + 1} 次重试...`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
          continue;
        }
        throw new Error(`分段下载失败（已重试 ${MAX_RETRIES} 次）: ${url.split('/').pop()}`);
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
    }
    throw new Error('不可达');
  }

  private async downloadSegments(
    segments: M3u8Segment[],
    chunks: ArrayBuffer[],
    signal: AbortSignal,
    onSegmentDone: (idx: number, size: number) => void
  ): Promise<void> {
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < segments.length) {
        if (signal.aborted) throw new Error('下载已取消');

        const idx = nextIndex++;
        const segment = segments[idx]!;

        const buf = await this.fetchSegmentWithRetry(segment.url, signal);
        chunks[idx] = buf;
        onSegmentDone(idx, buf.byteLength);
      }
    };

    const concurrency = Math.min(HLS_DOWNLOAD_CONCURRENCY, segments.length);
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }
}

export const hlsContentDownloader = new HlsContentDownloader();
