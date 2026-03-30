/**
 * Video Companion - Content Script 入口
 */

import './styles/index.css';
import type { UserSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { sendMessage } from '@shared/utils';
import { initLanguage } from '@shared/i18n';
import { extensionController } from './core/ExtensionController';
import { setupMessageHandler } from './handlers/message';

async function loadSettings(): Promise<UserSettings> {
  const response = await sendMessage<{ success: boolean; data?: UserSettings }>({ action: 'getSettings' });
  return response?.data || DEFAULT_SETTINGS;
}

async function init(): Promise<void> {
  try {
    // 加载用户设置
    const settings = await loadSettings();

    // 初始化语言
    await initLanguage();

    // 设置消息处理器（始终需要，用于接收启用/禁用消息）
    setupMessageHandler();

    // 只有在启用状态下才启动
    if (settings.enabled) {
      extensionController.enable(settings);
    } else {
      console.log('Video Companion: 扩展已禁用，等待启用');
    }

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
