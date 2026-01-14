/**
 * Video Companion - Content Script 入口
 */

import './styles/index.css';
import type { UserSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { sendMessage } from '@shared/utils';
import { videoEnhancer } from './core/VideoEnhancer';
import { setupMessageHandler } from './handlers/message';
import { setupKeyboardHandler } from './handlers/keyboard';

async function loadSettings(): Promise<UserSettings> {
  const response = await sendMessage<UserSettings>({ action: 'getSettings' });
  return response || DEFAULT_SETTINGS;
}

async function init(): Promise<void> {
  try {
    // 加载用户设置
    const settings = await loadSettings();
    videoEnhancer.updateSettings(settings);

    // 设置消息处理器
    setupMessageHandler();

    // 设置键盘快捷键
    if (settings.enableShortcuts) {
      setupKeyboardHandler();
    }

    // 启动视频扫描器
    videoEnhancer.start();

    console.log('Video Companion: 初始化完成');
  } catch (error) {
    console.error('Video Companion: 初始化失败', error);
  }
}

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
