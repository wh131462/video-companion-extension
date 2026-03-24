/**
 * MPEG-TS → MP4 转封装器
 * 使用 mux.js Transmuxer 将 TS 分段转封装为可播放的 fMP4（无需重新编码）
 * 如果分段本身已是 fMP4 格式则直接合并
 */

// 直接导入子模块，避免 Vite CJS→ESM 主入口转换问题
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — mux.js 无类型定义
import muxjsTransmuxer from 'mux.js/lib/mp4/transmuxer';

interface TransmuxSegment {
  initSegment: Uint8Array;
  data: Uint8Array;
  type: string;
}

/**
 * 检测数据是否为 MPEG-TS 格式（同步字节 0x47）
 */
function isTsData(data: Uint8Array): boolean {
  if (data.length < 188) return false;
  if (data[0] === 0x47) return true;
  for (let i = 0; i < Math.min(data.length, 1000); i++) {
    if (data[i] === 0x47 && i + 188 < data.length && data[i + 188] === 0x47) {
      return true;
    }
  }
  return false;
}

/**
 * 将多个 MPEG-TS 分段转封装为一个 MP4 Blob
 */
export async function transmuxTsToMp4(tsChunks: ArrayBuffer[]): Promise<Blob> {
  if (tsChunks.length === 0) {
    throw new Error('没有可转封装的数据');
  }

  const firstChunk = new Uint8Array(tsChunks[0]!);

  // 非 TS 格式（fMP4 等），直接合并
  if (!isTsData(firstChunk)) {
    return new Blob(tsChunks, { type: 'video/mp4' });
  }

  // 获取 Transmuxer 构造函数
  const Transmuxer = muxjsTransmuxer.Transmuxer
    ?? (muxjsTransmuxer as unknown as { default: { Transmuxer: new () => unknown } }).default?.Transmuxer;

  if (!Transmuxer) {
    return new Blob(tsChunks, { type: 'video/mp2t' });
  }

  return new Promise((resolve) => {
    try {
      const transmuxer = new Transmuxer();
      const outputParts: Uint8Array[] = [];
      let initSegmentSaved = false;

      (transmuxer as { on(event: string, cb: (seg: TransmuxSegment) => void): void }).on('data', (segment: TransmuxSegment) => {
        if (!initSegmentSaved && segment.initSegment) {
          outputParts.push(segment.initSegment);
          initSegmentSaved = true;
        }
        if (segment.data) {
          outputParts.push(segment.data);
        }
      });

      (transmuxer as { on(event: string, cb: () => void): void }).on('done', () => {
        if (outputParts.length === 0) {
          resolve(new Blob(tsChunks, { type: 'video/mp2t' }));
          return;
        }
        const blob = new Blob(outputParts as unknown as BlobPart[], { type: 'video/mp4' });
        resolve(blob);
      });

      // 合并所有 TS 分段为连续流
      const totalLength = tsChunks.reduce((sum, c) => sum + c.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of tsChunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      (transmuxer as { push(data: Uint8Array): void }).push(combined);
      (transmuxer as { flush(): void }).flush();
    } catch (err) {
      console.error('[Video Companion] TS→MP4 转封装失败:', err);
      resolve(new Blob(tsChunks, { type: 'video/mp2t' }));
    }
  });
}
