/**
 * 视频播放器 UI - 通用视频链接播放对话框 + 自定义播放器
 * 支持 m3u8 (HLS) 和直接视频文件 (mp4/webm/ogg 等)
 * 使用 Shadow DOM 完全脱离页面文档流和样式
 */

import { m3u8SourceCollector } from './M3u8SourceCollector';
import { hlsPlayer } from '../features/HlsPlayer';
import { hlsContentDownloader, type M3u8Variant } from './HlsContentDownloader';
import { showToast } from '../ui/Toast';
import { SPEED_OPTIONS, Z_INDEX } from '@shared/constants';
import { generateFileName } from '@shared/utils';

const M3U8_URL_PATTERN = /\.m3u8(\?|#|$)/i;

// ===== SVG 图标 =====
const SVG = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
  volumeLow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  screenshot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  pip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" opacity="0.3"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  exitFullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>',
  retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  loop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
};

// ===== 内联样式 =====
const SHADOW_STYLES = `
:host {
  all: initial;
  position: fixed;
  top: 0; left: 0;
  width: 0; height: 0;
  z-index: ${Z_INDEX.player};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #e4e4e7;
}
*, *::before, *::after { box-sizing: border-box; }

/* ===== 对话框 ===== */
.overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.dialog {
  position: relative;
  width: 460px;
  max-width: 90vw;
  max-height: 80vh;
  background: rgba(22,22,28,0.97);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dialog h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
  flex-shrink: 0;
}
.close-btn {
  position: absolute;
  top: 14px; right: 14px;
  width: 28px; height: 28px;
  border: none;
  background: transparent;
  color: #52525b;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.15s ease;
}
.close-btn:hover { background: rgba(255,255,255,0.08); color: #ef4444; }

.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.input-row input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease;
  font-family: inherit;
}
.input-row input:focus { border-color: #6366f1; }
.input-row input::placeholder { color: #52525b; }
.play-btn {
  height: 40px;
  padding: 0 20px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  white-space: nowrap;
  font-family: inherit;
}
.play-btn:hover { opacity: 0.9; }

.list-title {
  font-size: 12px;
  color: #71717a;
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.source-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dialog-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(99,102,241,0.35) rgba(255,255,255,0.04);
}
.dialog-scroll::-webkit-scrollbar { width: 5px; }
.dialog-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
.dialog-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.35); border-radius: 3px; }
.dialog-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.55); }
.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  transition: background 0.15s ease;
}
.source-item:hover { background: rgba(255,255,255,0.08); }
.source-url {
  flex: 1;
  font-size: 12px;
  color: #71717a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-actions { display: flex; gap: 4px; flex-shrink: 0; }
.action-btn {
  height: 26px;
  padding: 0 10px;
  background: rgba(99,102,241,0.15);
  border: none;
  border-radius: 6px;
  color: #818cf8;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}
.action-btn:hover { background: rgba(99,102,241,0.3); }
.action-btn.download { background: rgba(34,197,94,0.15); color: #4ade80; }
.action-btn.download:hover { background: rgba(34,197,94,0.3); }

/* ===== 播放器窗口 ===== */
.player-window {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 640px;
  height: 400px;
  background: #0c0c12;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.65);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: win-in 0.25s cubic-bezier(0.16,1,0.3,1);
}
@keyframes win-in {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 标题栏 */
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding: 0 6px 0 14px;
  background: rgba(255,255,255,0.04);
  cursor: move;
  user-select: none;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.titlebar-text {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.02em;
}
.titlebar-btns { display: flex; gap: 1px; }
.tb {
  width: 26px; height: 26px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 15px;
  transition: all 0.12s ease;
  padding: 0;
}
.tb:hover { background: rgba(255,255,255,0.08); color: #fff; }
.tb.btn-close:hover { background: rgba(239,68,68,0.2); color: #f87171; }

/* 视频容器 — 控制栏悬浮覆盖在视频底部 */
.video-area {
  flex: 1;
  position: relative;
  min-height: 0;
  background: #000;
  overflow: hidden;
}
.player-video {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
  outline: none;
  object-fit: contain;
}

/* 中央播放动画 */
.center-icon {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%) scale(0.6);
  width: 52px; height: 52px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease;
}
.center-icon svg { width: 22px; height: 22px; color: #fff; }
.center-icon.flash {
  opacity: 1;
  transform: translate(-50%,-50%) scale(1);
}
.center-icon.fade {
  opacity: 0;
  transform: translate(-50%,-50%) scale(1.15);
}

/* 加载 */
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  pointer-events: none;
}
.spinner {
  width: 32px; height: 32px;
  border: 2.5px solid rgba(255,255,255,0.15);
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 底部控制栏 — 悬浮在视频底部 ===== */
.controls {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}
.video-area:hover .controls,
.video-area.ctrl-locked .controls {
  opacity: 1;
  pointer-events: auto;
}

/* 进度条 */
.prog-wrap {
  padding: 0 12px;
  height: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}
.prog-track {
  position: relative;
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.18);
  border-radius: 1.5px;
  transition: height 0.12s ease;
}
.prog-wrap:hover .prog-track { height: 5px; }
.prog-buf {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  background: rgba(255,255,255,0.2);
  border-radius: inherit;
  pointer-events: none;
}
.prog-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  background: linear-gradient(90deg, #818cf8, #a78bfa);
  border-radius: inherit;
  pointer-events: none;
}
.prog-dot {
  position: absolute;
  top: 50%;
  width: 13px; height: 13px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%,-50%) scale(0);
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  pointer-events: none;
  transition: transform 0.12s ease;
}
.prog-wrap:hover .prog-dot { transform: translate(-50%,-50%) scale(1); }

/* 进度悬浮时间 */
.prog-tip {
  position: absolute;
  top: -22px;
  padding: 2px 7px;
  background: rgba(0,0,0,0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  transform: translateX(-50%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease;
  font-family: 'SF Mono', 'Menlo', monospace;
}
.prog-wrap:hover .prog-tip { opacity: 1; }

/* 按钮行 */
.btn-row {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 6px 4px;
  gap: 1px;
}

/* 控制按钮 */
.cb {
  width: 34px; height: 30px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.12s ease;
  padding: 0;
  flex-shrink: 0;
}
.cb svg { width: 16px; height: 16px; }
.cb:hover { background: rgba(255,255,255,0.1); color: #fff; }
.cb:active { transform: scale(0.9); }
.cb.btn-play { width: 38px; }
.cb.btn-play svg { width: 18px; height: 18px; }

/* 时间 */
.time {
  font-size: 11px;
  color: rgba(255,255,255,0.55);
  padding: 0 8px;
  white-space: nowrap;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-weight: 500;
  user-select: none;
  letter-spacing: 0.02em;
}
.time .cur { color: rgba(255,255,255,0.9); }

/* 间隔 */
.spacer { flex: 1; }

/* 音量 */
.vol-group {
  display: flex;
  align-items: center;
  position: relative;
}
.vol-slider-wrap {
  width: 0;
  overflow: hidden;
  transition: width 0.2s cubic-bezier(0.16,1,0.3,1);
  display: flex;
  align-items: center;
}
.vol-group:hover .vol-slider-wrap { width: 64px; }
.vol-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 56px;
  height: 3px;
  margin: 0 4px;
  background: linear-gradient(to right,
    #818cf8 0%, #818cf8 var(--v,100%),
    rgba(255,255,255,0.15) var(--v,100%),
    rgba(255,255,255,0.15) 100%
  );
  border-radius: 2px;
  cursor: pointer;
  outline: none;
}
.vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 11px; height: 11px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.vol-slider::-moz-range-thumb {
  width: 11px; height: 11px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
.vol-slider-wrap { position: relative; }
.vol-tip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: rgba(22,22,28,0.95);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 20;
}
.vol-tip.show { opacity: 1; }

/* 倍速 */
.spd-btn {
  height: 30px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'SF Mono', 'Menlo', monospace;
  color: rgba(255,255,255,0.7);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.12s ease;
  white-space: nowrap;
  position: relative;
}
.spd-btn:hover { background: rgba(255,255,255,0.1); color: #a78bfa; }

.spd-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) scale(0.95);
  background: rgba(22,22,28,0.98);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 4px;
  display: none;
  flex-direction: column;
  gap: 1px;
  min-width: 56px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.55);
  z-index: 10;
  opacity: 0;
  transition: opacity 0.12s ease, transform 0.12s ease;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}
.spd-menu::-webkit-scrollbar { width: 4px; }
.spd-menu::-webkit-scrollbar-track { background: transparent; }
.spd-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
.spd-menu::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
.spd-menu.show {
  display: flex;
  opacity: 1;
  transform: translateX(-50%) scale(1);
}
.spd-opt {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  border-radius: 6px;
  text-align: center;
  transition: all 0.1s ease;
  border: none;
  background: transparent;
  font-family: inherit;
  white-space: nowrap;
}
.spd-opt:hover { background: rgba(255,255,255,0.08); color: #fff; }
.spd-opt.on {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  font-weight: 600;
}

/* 循环播放 */
.btn-loop { opacity: 0.45; }
.btn-loop.on { opacity: 1; color: #a78bfa; }

/* 分隔竖线 */
.sep {
  width: 1px;
  height: 14px;
  background: rgba(255,255,255,0.08);
  margin: 0 3px;
  flex-shrink: 0;
}

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  right: 0; bottom: 0;
  width: 14px; height: 14px;
  cursor: nwse-resize;
  z-index: 5;
}
.resize-handle::before {
  content: '';
  position: absolute;
  right: 3px; bottom: 3px;
  width: 7px; height: 7px;
  border-right: 2px solid rgba(255,255,255,0.15);
  border-bottom: 2px solid rgba(255,255,255,0.15);
}
.resize-handle:hover::before { border-color: rgba(255,255,255,0.4); }

/* 质量选择弹窗 */
.quality-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.quality-dialog {
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 20px;
  min-width: 280px;
  max-width: 360px;
  color: #fff;
}
.quality-dialog h3 {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
}
.quality-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.quality-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: all 0.15s ease;
}
.quality-item:hover { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3); }
.quality-item.selected { background: rgba(139,92,246,0.2); border-color: #8b5cf6; }
.quality-item .q-label { font-size: 13px; font-weight: 500; }
.quality-item .q-bw { font-size: 11px; color: rgba(255,255,255,0.5); }
.quality-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.quality-actions button {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.quality-actions .q-cancel {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}
.quality-actions .q-cancel:hover { background: rgba(255,255,255,0.15); }
.quality-actions .q-confirm {
  background: #8b5cf6;
  color: #fff;
}
.quality-actions .q-confirm:hover { background: #7c3aed; }
`;

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export class HlsPlayerUI {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;

  private ensureShadowHost(): ShadowRoot {
    if (this.shadow) return this.shadow;
    this.host = document.createElement('vc-hls-ui');
    this.shadow = this.host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = SHADOW_STYLES;
    this.shadow.appendChild(style);
    document.body.appendChild(this.host);
    return this.shadow;
  }

  /* ==================== 对话框 ==================== */

  show(): void {
    this.destroyDialog();
    const shadow = this.ensureShadowHost();

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.dataset.role = 'dialog';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';

    const title = document.createElement('h3');
    title.textContent = '视频播放器';
    dialog.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.destroyDialog());
    dialog.appendChild(closeBtn);

    const inputRow = document.createElement('div');
    inputRow.className = 'input-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '粘贴视频链接（m3u8、mp4、webm...）';
    const playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.textContent = '播放';
    const doPlay = () => { const u = input.value.trim(); if (u) this.playUrl(u); };
    playBtn.addEventListener('click', doPlay);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doPlay(); });
    inputRow.appendChild(input);
    inputRow.appendChild(playBtn);
    dialog.appendChild(inputRow);

    // 可滚动的列表容器
    const scrollArea = document.createElement('div');
    scrollArea.className = 'dialog-scroll';

    // 流媒体源列表（m3u8）
    const m3u8Sources = m3u8SourceCollector.getSources();
    if (m3u8Sources.length > 0) {
      const lt = document.createElement('div');
      lt.className = 'list-title';
      lt.textContent = `流媒体源 (${m3u8Sources.length})`;
      scrollArea.appendChild(lt);

      const list = document.createElement('div');
      list.className = 'source-list';
      m3u8Sources.forEach((src) => {
        list.appendChild(this.createSourceItem(src.url, true));
      });
      scrollArea.appendChild(list);
    }

    // 页面视频源
    const videoSources = this.collectVideoSources();
    if (videoSources.length > 0) {
      const lt = document.createElement('div');
      lt.className = 'list-title';
      lt.textContent = `页面视频 (${videoSources.length})`;
      scrollArea.appendChild(lt);

      const list = document.createElement('div');
      list.className = 'source-list';
      videoSources.forEach((url) => {
        list.appendChild(this.createSourceItem(url, false));
      });
      scrollArea.appendChild(list);
    }

    dialog.appendChild(scrollArea);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.destroyDialog(); });
    shadow.appendChild(overlay);
    requestAnimationFrame(() => input.focus());
  }

  /* ==================== 播放器 ==================== */

  private async playUrl(url: string): Promise<void> {
    this.destroyDialog();
    this.destroyPlayer();
    const shadow = this.ensureShadowHost();

    try {
      // -- 窗口 --
      const pw = document.createElement('div');
      pw.className = 'player-window';
      pw.dataset.role = 'player';

      // -- 标题栏 --
      const tb = document.createElement('div');
      tb.className = 'titlebar';
      const tbText = document.createElement('span');
      tbText.className = 'titlebar-text';
      tbText.textContent = 'Video Player';
      const tbBtns = document.createElement('div');
      tbBtns.className = 'titlebar-btns';
      const closeBtn = this.mkTb('&times;', 'btn-close');
      tbBtns.appendChild(closeBtn);
      tb.appendChild(tbText);
      tb.appendChild(tbBtns);

      // -- 视频区域 --
      const area = document.createElement('div');
      area.className = 'video-area';

      const video = document.createElement('video');
      video.className = 'player-video';
      video.autoplay = true;
      video.playsInline = true;

      const centerIcon = document.createElement('div');
      centerIcon.className = 'center-icon';
      centerIcon.innerHTML = SVG.play;

      const loading = document.createElement('div');
      loading.className = 'loading';
      loading.innerHTML = '<div class="spinner"></div>';

      // -- 控制栏 (覆盖在视频底部) --
      const ctrl = document.createElement('div');
      ctrl.className = 'controls';

      // 进度条
      const progWrap = document.createElement('div');
      progWrap.className = 'prog-wrap';
      const progTrack = document.createElement('div');
      progTrack.className = 'prog-track';
      const progBuf = document.createElement('div');
      progBuf.className = 'prog-buf';
      const progFill = document.createElement('div');
      progFill.className = 'prog-fill';
      const progDot = document.createElement('div');
      progDot.className = 'prog-dot';
      const progTip = document.createElement('div');
      progTip.className = 'prog-tip';
      progTip.textContent = '0:00';
      progTrack.append(progBuf, progFill, progDot, progTip);
      progWrap.appendChild(progTrack);

      // 按钮行
      const row = document.createElement('div');
      row.className = 'btn-row';

      const btnPlay = this.mkCb('btn-play', SVG.play);
      const timeEl = document.createElement('span');
      timeEl.className = 'time';
      timeEl.innerHTML = '<span class="cur">0:00</span>&nbsp;/&nbsp;0:00';
      const spacer = document.createElement('div');
      spacer.className = 'spacer';

      // 音量
      const volGrp = document.createElement('div');
      volGrp.className = 'vol-group';
      const btnVol = this.mkCb('', SVG.volume);
      const volWrap = document.createElement('div');
      volWrap.className = 'vol-slider-wrap';
      const volSlider = document.createElement('input');
      volSlider.type = 'range';
      volSlider.className = 'vol-slider';
      volSlider.min = '0'; volSlider.max = '1'; volSlider.step = '0.02'; volSlider.value = '1';
      volSlider.style.setProperty('--v', '100%');
      const volTip = document.createElement('div');
      volTip.className = 'vol-tip';
      volTip.textContent = '100%';
      volWrap.appendChild(volSlider);
      volGrp.append(btnVol, volWrap, volTip);

      const sep1 = this.mkSep();

      // 倍速
      const spdWrap = document.createElement('div');
      spdWrap.style.cssText = 'position:relative;display:inline-flex';
      const spdBtn = document.createElement('button');
      spdBtn.className = 'spd-btn';
      spdBtn.textContent = '1x';
      const spdMenu = document.createElement('div');
      spdMenu.className = 'spd-menu';
      SPEED_OPTIONS.forEach((s) => {
        const o = document.createElement('button');
        o.className = 'spd-opt' + (s === 1 ? ' on' : '');
        o.textContent = `${s}x`;
        o.dataset.s = String(s);
        spdMenu.appendChild(o);
      });
      spdWrap.append(spdBtn, spdMenu);

      const btnLoop = this.mkCb('btn-loop', SVG.loop);

      const sep2 = this.mkSep();
      const btnShot = this.mkCb('', SVG.screenshot);
      const btnDl = this.mkCb('', SVG.download);
      const btnPip = this.mkCb('', SVG.pip);
      const btnFs = this.mkCb('btn-fs', SVG.fullscreen);

      row.append(btnPlay, timeEl, spacer, volGrp, sep1, spdWrap, btnLoop, sep2, btnShot, btnDl, btnPip, btnFs);
      ctrl.append(progWrap, row);

      area.append(video, centerIcon, loading, ctrl);

      const resize = document.createElement('div');
      resize.className = 'resize-handle';

      pw.append(tb, area, resize);
      shadow.appendChild(pw);

      // ===== 事件绑定 =====
      const isM3u8 = M3U8_URL_PATTERN.test(url);
      this.bindEvents({
        pw, area, video, centerIcon, loading,
        progWrap, progTrack, progBuf, progFill, progDot, progTip,
        btnPlay, timeEl,
        btnVol, volSlider, volTip,
        spdBtn, spdMenu, btnLoop,
        btnShot, btnDl, btnPip, btnFs,
        closeBtn, tb, resize, url, isM3u8,
      });
      this.setupDrag(pw, tb);
      this.setupResize(pw, resize);

      if (isM3u8) {
        await hlsPlayer.loadM3u8(video, url);
      } else {
        video.src = url;
        await video.play().catch(() => {});
      }
      loading.remove();
      showToast('视频加载成功');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '视频播放失败');
    }
  }

  private mkTb(html: string, cls = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'tb' + (cls ? ` ${cls}` : '');
    b.innerHTML = html;
    return b;
  }
  private mkCb(cls: string, svg: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'cb' + (cls ? ` ${cls}` : '');
    b.innerHTML = svg;
    return b;
  }
  private mkSep(): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'sep';
    return d;
  }

  /* ==================== 事件绑定 ==================== */

  private bindEvents(c: {
    pw: HTMLElement; area: HTMLElement; video: HTMLVideoElement;
    centerIcon: HTMLElement; loading: HTMLElement;
    progWrap: HTMLElement; progTrack: HTMLElement;
    progBuf: HTMLElement; progFill: HTMLElement;
    progDot: HTMLElement; progTip: HTMLElement;
    btnPlay: HTMLButtonElement; timeEl: HTMLElement;
    btnVol: HTMLButtonElement; volSlider: HTMLInputElement; volTip: HTMLElement;
    spdBtn: HTMLButtonElement; spdMenu: HTMLElement; btnLoop: HTMLButtonElement;
    btnShot: HTMLButtonElement; btnDl: HTMLButtonElement;
    btnPip: HTMLButtonElement; btnFs: HTMLButtonElement;
    closeBtn: HTMLButtonElement; tb: HTMLElement;
    resize: HTMLElement; url: string; isM3u8: boolean;
  }): void {
    const { video } = c;
    let seeking = false;
    let ctrlTimer: ReturnType<typeof setTimeout> | null = null;
    let spdOpen = false;

    // -- 控制栏自动显隐 --
    const lockCtrl = () => {
      c.area.classList.add('ctrl-locked');
      if (ctrlTimer) clearTimeout(ctrlTimer);
      ctrlTimer = setTimeout(() => c.area.classList.remove('ctrl-locked'), 2500);
    };
    c.area.addEventListener('mousemove', lockCtrl);
    c.area.addEventListener('mouseenter', lockCtrl);

    // -- 播放/暂停 --
    let flashTimer: ReturnType<typeof setTimeout> | null = null;
    const flash = (svg: string) => {
      c.centerIcon.innerHTML = svg;
      c.centerIcon.classList.remove('fade');
      c.centerIcon.classList.add('flash');
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(() => {
        c.centerIcon.classList.remove('flash');
        c.centerIcon.classList.add('fade');
      }, 350);
    };
    const toggle = () => { if (video.paused) video.play(); else video.pause(); };
    const syncPlayBtn = () => {
      c.btnPlay.innerHTML = video.paused ? SVG.play : SVG.pause;
    };
    video.addEventListener('play', syncPlayBtn);
    video.addEventListener('pause', syncPlayBtn);

    c.btnPlay.addEventListener('click', () => { toggle(); flash(video.paused ? SVG.play : SVG.pause); });
    video.addEventListener('click', () => { toggle(); flash(video.paused ? SVG.play : SVG.pause); });
    // 双击全屏
    video.addEventListener('dblclick', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else c.pw.requestFullscreen().catch(() => {});
    });

    // -- 进度 --
    const syncProgress = () => {
      if (seeking) return;
      const dur = video.duration || 0;
      const pct = dur > 0 ? (video.currentTime / dur) * 100 : 0;
      c.progFill.style.width = `${pct}%`;
      c.progDot.style.left = `${pct}%`;
      c.timeEl.innerHTML = `<span class="cur">${fmt(video.currentTime)}</span>&nbsp;/&nbsp;${fmt(dur)}`;
      if (video.buffered.length > 0) {
        const be = video.buffered.end(video.buffered.length - 1);
        c.progBuf.style.width = `${dur > 0 ? (be / dur) * 100 : 0}%`;
      }
    };
    video.addEventListener('timeupdate', syncProgress);
    video.addEventListener('loadedmetadata', syncProgress);
    video.addEventListener('progress', syncProgress);

    video.addEventListener('waiting', () => {
      if (!c.loading.parentElement) c.area.appendChild(c.loading);
    });
    video.addEventListener('playing', () => c.loading.remove());

    // 进度条拖拽
    const seekTo = (e: MouseEvent, commit: boolean) => {
      const r = c.progTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const dur = video.duration || 0;
      c.progFill.style.width = `${pct * 100}%`;
      c.progDot.style.left = `${pct * 100}%`;
      c.progTip.textContent = fmt(pct * dur);
      c.progTip.style.left = `${pct * 100}%`;
      if (commit) video.currentTime = pct * dur;
    };
    c.progWrap.addEventListener('mousedown', (e) => {
      seeking = true;
      seekTo(e, true);
      const mv = (ev: MouseEvent) => seekTo(ev, true);
      const up = () => { seeking = false; document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    });
    c.progWrap.addEventListener('mousemove', (e) => {
      if (seeking) return;
      const r = c.progTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      c.progTip.textContent = fmt(pct * (video.duration || 0));
      c.progTip.style.left = `${pct * 100}%`;
    });

    // -- 音量 --
    const syncVolIcon = () => {
      let svg = SVG.volume;
      if (video.muted || video.volume === 0) svg = SVG.mute;
      else if (video.volume < 0.5) svg = SVG.volumeLow;
      c.btnVol.innerHTML = svg;
    };
    c.btnVol.addEventListener('click', () => { video.muted = !video.muted; syncVolIcon(); });
    let volTipTimer: ReturnType<typeof setTimeout> | null = null;
    const showVolTip = (v: number) => {
      c.volTip.textContent = `${Math.round(v * 100)}%`;
      c.volTip.classList.add('show');
      if (volTipTimer) clearTimeout(volTipTimer);
      volTipTimer = setTimeout(() => c.volTip.classList.remove('show'), 800);
    };
    c.volSlider.addEventListener('input', () => {
      const v = parseFloat(c.volSlider.value);
      video.volume = v;
      video.muted = v === 0;
      c.volSlider.style.setProperty('--v', `${v * 100}%`);
      syncVolIcon();
      showVolTip(v);
    });
    video.addEventListener('volumechange', () => {
      if (!video.muted) {
        c.volSlider.value = String(video.volume);
        c.volSlider.style.setProperty('--v', `${video.volume * 100}%`);
      }
      syncVolIcon();
    });

    // -- 倍速 --
    c.spdBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      spdOpen = !spdOpen;
      c.spdMenu.classList.toggle('show', spdOpen);
    });
    c.spdMenu.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('.spd-opt') as HTMLElement | null;
      if (!t) return;
      const spd = parseFloat(t.dataset.s || '1');
      video.playbackRate = spd;
      c.spdBtn.textContent = `${spd}x`;
      c.spdMenu.querySelectorAll('.spd-opt').forEach((el) => el.classList.toggle('on', el === t));
      spdOpen = false;
      c.spdMenu.classList.remove('show');
    });
    c.pw.addEventListener('click', () => { if (spdOpen) { spdOpen = false; c.spdMenu.classList.remove('show'); } });

    // -- 循环播放 --
    c.btnLoop.addEventListener('click', () => {
      video.loop = !video.loop;
      c.btnLoop.classList.toggle('on', video.loop);
    });

    // -- 截图 --
    c.btnShot.addEventListener('click', () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = video.videoWidth; cv.height = video.videoHeight;
        cv.getContext('2d')!.drawImage(video, 0, 0);
        const a = document.createElement('a');
        a.href = cv.toDataURL('image/png');
        a.download = `hls-screenshot-${Date.now()}.png`;
        a.click();
        showToast('截图已保存');
      } catch { showToast('截图失败'); }
    });

    // -- 下载 --
    c.btnDl.addEventListener('click', () => {
      if (c.isM3u8) {
        this.startDownloadWithProgress(c.btnDl, c.url);
      } else {
        this.downloadDirectVideo(c.url);
      }
    });

    // -- 画中画 --
    c.btnPip.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      } catch { showToast('画中画不可用'); }
    });

    // -- 全屏 --
    c.btnFs.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else c.pw.requestFullscreen().catch(() => showToast('全屏不可用'));
    });
    const syncFsIcon = () => {
      c.btnFs.innerHTML = document.fullscreenElement ? SVG.exitFullscreen : SVG.fullscreen;
    };
    document.addEventListener('fullscreenchange', syncFsIcon);

    // -- 关闭 --
    c.closeBtn.addEventListener('click', () => { hlsPlayer.destroyHls(); c.pw.remove(); });

    // -- 键盘 --
    c.pw.tabIndex = 0;
    c.pw.style.outline = 'none';
    c.pw.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); toggle(); flash(video.paused ? SVG.play : SVG.pause); break;
        case 'ArrowLeft': e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); break;
        case 'ArrowRight': e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); break;
        case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break;
        case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break;
        case 'm': video.muted = !video.muted; syncVolIcon(); break;
        case 'f': c.btnFs.click(); break;
      }
    });
    requestAnimationFrame(() => c.pw.focus());
  }

  /* ==================== 拖拽 & 缩放 ==================== */

  private setupDrag(el: HTMLElement, handle: HTMLElement): void {
    let on = false, sx = 0, sy = 0, sl = 0, st = 0;
    handle.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.tb')) return;
      on = true; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); sl = r.left; st = r.top;
      el.style.transition = 'none'; e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!on) return;
      el.style.left = `${sl + e.clientX - sx}px`;
      el.style.top = `${st + e.clientY - sy}px`;
      el.style.right = 'auto'; el.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { if (on) { on = false; el.style.transition = ''; } });
  }

  private setupResize(el: HTMLElement, handle: HTMLElement): void {
    let on = false, sx = 0, sy = 0, sw = 0, sh = 0;
    handle.addEventListener('mousedown', (e) => {
      on = true; sx = e.clientX; sy = e.clientY; sw = el.offsetWidth; sh = el.offsetHeight;
      el.style.transition = 'none'; e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener('mousemove', (e) => {
      if (!on) return;
      el.style.width = `${Math.max(400, sw + e.clientX - sx)}px`;
      el.style.height = `${Math.max(280, sh + e.clientY - sy)}px`;
    });
    document.addEventListener('mouseup', () => { if (on) { on = false; el.style.transition = ''; } });
  }

  /* ==================== 工具 ==================== */

  /** 收集页面中所有 video 元素的直接 URL 源 */
  private collectVideoSources(): string[] {
    const urls = new Set<string>();

    // 检查当前页面 URL 本身是否是视频文件（直接访问视频链接的场景）
    const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg|mkv|avi|mov)(\?|#|$)/i;
    if (VIDEO_FILE_PATTERN.test(location.href)) {
      urls.add(location.href);
    }

    document.querySelectorAll('video').forEach((video) => {
      const src = video.src || video.currentSrc;
      if (src && /^https?:\/\//i.test(src)) {
        urls.add(src);
      }
      video.querySelectorAll('source').forEach((source) => {
        if (source.src && /^https?:\/\//i.test(source.src)) {
          urls.add(source.src);
        }
      });
    });
    return [...urls];
  }

  /** 创建一个源列表项（播放/下载/复制按钮） */
  private createSourceItem(url: string, isM3u8: boolean): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'source-item';
    const urlEl = document.createElement('span');
    urlEl.className = 'source-url';
    urlEl.textContent = this.truncUrl(url, 55);
    urlEl.title = url;
    const acts = document.createElement('div');
    acts.className = 'source-actions';

    const pBtn = document.createElement('button');
    pBtn.className = 'action-btn';
    pBtn.textContent = '播放';
    pBtn.addEventListener('click', () => this.playUrl(url));

    const dBtn = document.createElement('button');
    dBtn.className = 'action-btn download';
    dBtn.textContent = '下载';
    dBtn.addEventListener('click', () => {
      if (isM3u8) {
        this.startDownloadWithProgress(dBtn, url);
      } else {
        this.downloadDirectVideo(url);
      }
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(
        () => showToast('已复制链接'),
        () => showToast('复制失败')
      );
    });

    acts.appendChild(pBtn);
    acts.appendChild(dBtn);
    acts.appendChild(copyBtn);
    item.appendChild(urlEl);
    item.appendChild(acts);
    return item;
  }

  /** 直接视频文件下载 */
  private downloadDirectVideo(url: string): void {
    const link = document.createElement('a');
    link.href = url;
    const ext = url.match(/\.(mp4|webm|ogg|mkv|avi|mov)/i)?.[1] || 'mp4';
    link.download = generateFileName('video', ext);
    link.click();
    showToast('开始下载视频');
  }

  private startDownloadWithProgress(btn: HTMLButtonElement, url: string): void {
    if (hlsContentDownloader.isDownloading) {
      showToast('已有下载任务进行中');
      return;
    }
    const originalContent = btn.innerHTML;
    const isActionBtn = btn.classList.contains('action-btn');
    btn.disabled = true;
    if (isActionBtn) {
      btn.textContent = '解析中...';
    }

    // 先检测是否有多个质量可选
    hlsContentDownloader.getVariants(url).then((variants) => {
      if (variants.length > 1) {
        // 弹出质量选择
        btn.disabled = false;
        if (isActionBtn) btn.textContent = '下载';
        else btn.innerHTML = originalContent;
        this.showQualityPicker(btn, url, variants);
      } else {
        // 只有一个或无变体，直接下载
        this.doDownloadWithProgress(btn, url, originalContent, isActionBtn);
      }
    }).catch(() => {
      // 解析失败，直接尝试下载
      this.doDownloadWithProgress(btn, url, originalContent, isActionBtn);
    });
  }

  private doDownloadWithProgress(
    btn: HTMLButtonElement,
    url: string,
    originalContent: string,
    isActionBtn: boolean,
    variant?: M3u8Variant
  ): void {
    btn.disabled = true;
    if (isActionBtn) btn.textContent = '准备中...';

    const unsubscribe = hlsContentDownloader.onStateChange((state) => {
      switch (state.status) {
        case 'downloading':
          if (isActionBtn) {
            btn.textContent = `${state.percent}%`;
          } else {
            btn.innerHTML = `<span style="font-size:11px;color:#fff">${state.percent}%</span>`;
          }
          break;
        case 'transmuxing':
          if (isActionBtn) {
            btn.textContent = '转码中';
          } else {
            btn.innerHTML = `<span style="font-size:10px;color:#fff">转码中</span>`;
          }
          break;
        case 'error':
          btn.disabled = false;
          if (isActionBtn) {
            btn.textContent = '重试';
          } else {
            btn.innerHTML = SVG.retry;
          }
          btn.onclick = (e) => {
            e.stopPropagation();
            this.startDownloadWithProgress(btn, url);
          };
          unsubscribe();
          break;
        case 'done':
          btn.disabled = false;
          if (isActionBtn) {
            btn.textContent = '下载';
          } else {
            btn.innerHTML = originalContent;
          }
          btn.onclick = null;
          unsubscribe();
          break;
      }
    });
    hlsContentDownloader.download(url, variant);
  }

  private showQualityPicker(
    btn: HTMLButtonElement,
    url: string,
    variants: M3u8Variant[]
  ): void {
    if (!this.shadow) return;
    const overlay = document.createElement('div');
    overlay.className = 'quality-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'quality-dialog';

    const title = document.createElement('h3');
    title.textContent = '选择下载质量';
    dialog.appendChild(title);

    const list = document.createElement('div');
    list.className = 'quality-list';

    let selected = variants[0]!; // 默认选最高
    const items: HTMLDivElement[] = [];

    variants.forEach((v, i) => {
      const item = document.createElement('div');
      item.className = 'quality-item' + (i === 0 ? ' selected' : '');

      const label = document.createElement('span');
      label.className = 'q-label';
      const res = v.resolution;
      const height = res ? res.split('x')[1] : null;
      label.textContent = height ? `${height}p` : `变体 ${i + 1}`;

      const bw = document.createElement('span');
      bw.className = 'q-bw';
      const mbps = v.bandwidth / 1000000;
      bw.textContent = mbps >= 1 ? `${mbps.toFixed(1)} Mbps` : `${(v.bandwidth / 1000).toFixed(0)} Kbps`;

      item.append(label, bw);
      item.addEventListener('click', () => {
        items.forEach((it) => it.classList.remove('selected'));
        item.classList.add('selected');
        selected = v;
      });
      items.push(item);
      list.appendChild(item);
    });

    dialog.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'quality-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'q-cancel';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'q-confirm';
    confirmBtn.textContent = '开始下载';
    confirmBtn.addEventListener('click', () => {
      overlay.remove();
      const originalContent = btn.innerHTML;
      const isActionBtn = btn.classList.contains('action-btn');
      this.doDownloadWithProgress(btn, url, originalContent, isActionBtn, selected);
    });

    actions.append(cancelBtn, confirmBtn);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    this.shadow.appendChild(overlay);
  }
  private truncUrl(url: string, n: number): string {
    return url.length <= n ? url : url.slice(0, n - 3) + '...';
  }
  private destroyDialog(): void {
    this.shadow?.querySelector('[data-role="dialog"]')?.remove();
  }
  private destroyPlayer(): void {
    const p = this.shadow?.querySelector('[data-role="player"]');
    if (p) { hlsPlayer.destroyHls(); p.remove(); }
  }
  destroy(): void {
    if (this.host) { hlsPlayer.destroyHls(); this.host.remove(); this.host = null; this.shadow = null; }
  }
}

export const hlsPlayerUI = new HlsPlayerUI();
