/**
 * Video Companion - 工具函数
 */

import { SPEED_RANGE } from './constants';

/**
 * 限制数值在指定范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 限制播放速度在有效范围内
 */
export function clampSpeed(speed: number): number {
  return clamp(speed, SPEED_RANGE.min, SPEED_RANGE.max);
}

/**
 * 格式化播放速度显示
 */
export function formatSpeed(speed: number): string {
  return `${speed}x`;
}

/**
 * 生成时间戳文件名
 */
export function generateFileName(prefix: string, extension: string): string {
  return `${prefix}_${Date.now()}.${extension}`;
}

/**
 * 检查是否是有效的视频源
 */
export function isValidVideoSource(src: string | null | undefined): src is string {
  if (!src) return false;
  // blob: 和 data: 协议通常不支持直接下载
  return !src.startsWith('blob:') && !src.startsWith('data:');
}

/**
 * 查找视频容器
 */
export function findVideoContainer(video: HTMLVideoElement): HTMLElement {
  const selectors = [
    '.video-container',
    '.player',
    '.video-wrapper',
    '[class*="player"]',
  ];

  for (const selector of selectors) {
    const container = video.closest<HTMLElement>(selector);
    if (container) return container;
  }

  return video.parentElement || video;
}

/**
 * 安全地发送 Chrome 消息
 */
export async function sendMessage<T = unknown>(
  message: unknown
): Promise<T | null> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.warn('Video Companion: 消息发送失败', error);
    return null;
  }
}

/**
 * 检查元素是否是输入元素
 */
export function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    (element as HTMLElement).isContentEditable
  );
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}
