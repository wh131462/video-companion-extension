/**
 * 消息处理器
 */

import type { Message, MessageResponse, UserSettings, Stats } from '@shared/types';
import { storageService } from '../services/storage';

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
      handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('Video Companion: 消息处理错误', error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // 保持消息通道开放以支持异步响应
    }
  );
}

async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.action) {
    case 'getSettings': {
      const settings = await storageService.getSettings();
      return { success: true, data: settings };
    }

    case 'saveSettings': {
      if (message.settings) {
        await storageService.saveSettings(message.settings as UserSettings);
      }
      return { success: true };
    }

    case 'updateStats': {
      if (message.stats) {
        await storageService.updateStats(message.stats as Partial<Stats>);
      }
      return { success: true };
    }

    case 'getStats': {
      const stats = await storageService.getStats();
      return { success: true, data: stats };
    }

    default:
      return { success: false, error: 'Unknown action' };
  }
}

export function broadcastSettingsChange(settings: UserSettings): void {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsChanged',
          settings,
        }).catch(() => {
          // 忽略无法接收消息的标签页
        });
      }
    });
  });
}
