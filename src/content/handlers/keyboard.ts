/**
 * 键盘快捷键处理器
 */

import { isInputElement } from '@shared/utils';
import { videoEnhancer } from '../core/VideoEnhancer';
import { showToast } from '../ui/Toast';
import { pictureInPicture, fullscreen, playbackSpeed } from '../features';

export function setupKeyboardHandler(): void {
  document.addEventListener('keydown', handleKeyDown);
}

export function removeKeyboardHandler(): void {
  document.removeEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e: KeyboardEvent): void {
  // 忽略输入框中的按键
  if (isInputElement(document.activeElement)) return;

  const video = videoEnhancer.getFirstVideo();
  if (!video) return;

  const key = e.key.toLowerCase();

  // Alt + P: 画中画
  if (e.altKey && key === 'p') {
    e.preventDefault();
    pictureInPicture.toggle(video).catch((error) => {
      showToast(error.message);
    });
    return;
  }

  // Alt + F: 全屏
  if (e.altKey && key === 'f') {
    e.preventDefault();
    fullscreen.toggle(video).catch((error) => {
      showToast(error.message);
    });
    return;
  }

  // [ 键: 减速
  if (key === '[') {
    e.preventDefault();
    const speed = playbackSpeed.decreaseSpeed(video);
    showToast(`播放速度: ${speed.toFixed(2)}x`);
    videoEnhancer.getPanel(video)?.updateSpeedDisplay(speed);
    return;
  }

  // ] 键: 加速
  if (key === ']') {
    e.preventDefault();
    const speed = playbackSpeed.increaseSpeed(video);
    showToast(`播放速度: ${speed.toFixed(2)}x`);
    videoEnhancer.getPanel(video)?.updateSpeedDisplay(speed);
    return;
  }
}
