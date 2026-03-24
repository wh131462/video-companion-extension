/**
 * m3u8 URL 拦截器 - 在页面主世界（MAIN world）中运行
 * 通过 manifest.json 的 content_scripts world: "MAIN" 配置直接注入
 */

// 使文件成为模块，以支持 declare global
export {};

declare global {
  interface Window {
    __VC_M3U8_HOOKED__?: boolean;
  }
}

(function () {
  if ((window as Window).__VC_M3U8_HOOKED__) return;
  (window as Window).__VC_M3U8_HOOKED__ = true;

  const M3U8_PATTERN = /\.m3u8(\?|$)/i;
  const MESSAGE_TYPE = 'VC_M3U8_DETECTED';

  // 记录 master playlist 引用的所有 rendition URL，用于抑制子播放列表的重复报告
  const knownRenditionUrls: Record<string, boolean> = {};

  function resolveUrl(baseUrl: string, relativeUrl: string): string {
    if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      return base + relativeUrl;
    }
  }

  function isMediaPlaylist(content: string): boolean {
    // 至少有 2 个 #EXTINF: 分段才认为是有效视频流
    let count = 0;
    let idx = -1;
    while ((idx = content.indexOf('#EXTINF:', idx + 1)) !== -1) {
      count++;
      if (count >= 2) return true;
    }
    return false;
  }

  function isMasterPlaylist(content: string): boolean {
    return content.indexOf('#EXT-X-STREAM-INF:') !== -1;
  }

  /**
   * 从 master playlist 中提取所有 rendition URL（variant + audio/subtitle 等）
   */
  function extractRenditionUrls(content: string, baseUrl: string): Record<string, boolean> {
    const urls: Record<string, boolean> = {};
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      // #EXT-X-MEDIA:TYPE=AUDIO/SUBTITLES 的 URI
      if (line.indexOf('#EXT-X-MEDIA:') !== -1) {
        const uriMatch = line.match(/URI="([^"]+)"/);
        if (uriMatch && uriMatch[1]) {
          urls[resolveUrl(baseUrl, uriMatch[1])] = true;
        }
      }
      // #EXT-X-STREAM-INF 后面的 variant URL
      if (line.indexOf('#EXT-X-STREAM-INF:') !== -1) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim() && nextLine.trim().charAt(0) !== '#') {
          urls[resolveUrl(baseUrl, nextLine.trim())] = true;
        }
      }
    }
    return urls;
  }

  /**
   * 处理拦截到的 m3u8 内容，决定是否报告
   */
  function handleM3u8Content(text: string, capturedUrl: string, source: string): void {
    if (isMasterPlaylist(text)) {
      // master playlist：提取所有 rendition URL 并记录，然后报告 master 本身
      const renditions = extractRenditionUrls(text, capturedUrl);
      for (const key in renditions) {
        knownRenditionUrls[key] = true;
      }
      window.postMessage({ type: MESSAGE_TYPE, url: capturedUrl, source }, '*');
    } else if (isMediaPlaylist(text) && !knownRenditionUrls[capturedUrl]) {
      // 独立的 media playlist（非 master 的子 rendition）
      window.postMessage({ type: MESSAGE_TYPE, url: capturedUrl, source }, '*');
    }
  }

  // Hook fetch
  const originalFetch = window.fetch;
  window.fetch = function (...args: Parameters<typeof fetch>) {
    let m3u8Url: string | null = null;

    try {
      const url =
        typeof args[0] === 'string'
          ? args[0]
          : args[0] instanceof Request
            ? args[0].url
            : String(args[0]);

      // 跳过扩展内部的 fetch（带 X-VC-Internal header）
      let isInternal = false;
      try {
        const opts = args[1];
        if (opts && opts.headers) {
          const h = opts.headers instanceof Headers ? opts.headers : new Headers(opts.headers as HeadersInit);
          isInternal = h.has('X-VC-Internal');
        }
      } catch { /* ignore */ }

      if (M3U8_PATTERN.test(url) && !isInternal) {
        m3u8Url = url;
      }
    } catch { /* ignore */ }

    const result = originalFetch.apply(this, args);

    if (m3u8Url) {
      const capturedUrl = m3u8Url;
      result
        .then((response: Response) => response.clone().text())
        .then((text: string) => {
          handleM3u8Content(text, capturedUrl, 'fetch');
        })
        .catch(() => { /* ignore */ });
    }

    return result;
  };

  // Hook XMLHttpRequest.open
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    try {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (M3U8_PATTERN.test(urlStr)) {
        (this as XMLHttpRequest & { __vcM3u8Url?: string }).__vcM3u8Url = urlStr;
        this.addEventListener('load', function (this: XMLHttpRequest & { __vcM3u8Url?: string }) {
          try {
            if (this.__vcM3u8Url) {
              handleM3u8Content(this.responseText, this.__vcM3u8Url, 'xhr');
            }
          } catch { /* ignore */ }
        });
      }
    } catch { /* ignore */ }
    return (originalXHROpen as Function).apply(this, [method, url, ...rest]);
  };
})();
