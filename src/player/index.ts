/**
 * 独立 HLS 播放器页面逻辑
 */

import Hls from 'hls.js';

const urlInput = document.getElementById('urlInput') as HTMLInputElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const player = document.getElementById('player') as HTMLVideoElement;
const errorDiv = document.getElementById('error') as HTMLDivElement;

function showError(msg: string): void {
  errorDiv.textContent = msg;
}

function clearError(): void {
  errorDiv.textContent = '';
}

let hls: Hls | null = null;

function loadUrl(url: string): void {
  clearError();

  if (!url) {
    showError('请输入 m3u8 URL');
    return;
  }

  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true });
    hls.loadSource(url);
    hls.attachMedia(player);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      player.play().catch(() => {});
    });
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        showError(`HLS 错误: ${data.details}`);
      }
    });
  } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
    player.src = url;
    player.addEventListener('loadedmetadata', () => {
      player.play().catch(() => {});
    });
  } else {
    showError('当前浏览器不支持 HLS 播放');
  }
}

playBtn.addEventListener('click', () => loadUrl(urlInput.value.trim()));
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadUrl(urlInput.value.trim());
});

// 从 URL 参数中读取 m3u8 URL
const params = new URLSearchParams(location.search);
const m3u8Url = params.get('url');
if (m3u8Url) {
  urlInput.value = m3u8Url;
  loadUrl(m3u8Url);
}
