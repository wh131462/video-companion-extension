/**
 * Video Companion - Background Service Worker 入口
 */

import { storageService } from './services/storage';
import { setupMessageHandler, broadcastSettingsChange } from './handlers/message';
import { setupCommandHandler } from './handlers/command';
import { setupContextMenus, setupMenuClickHandler } from './handlers/menu';

// 扩展程序安装或更新
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await storageService.initializeDefaults();
    console.log('Video Companion: 已安装');
  } else if (details.reason === 'update') {
    await storageService.migrateSettings();
    console.log('Video Companion: 已更新到版本', chrome.runtime.getManifest().version);
  }

  // 设置右键菜单
  setupContextMenus();
});

// 扩展程序图标点击
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    console.log('Video Companion: 无法在此页面使用');
    return;
  }

  try {
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
    }
  } catch {
    // 内容脚本未加载，尝试手动注入
    if (tab.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/index.ts'],
        });
      } catch (error) {
        console.error('Video Companion: 无法注入脚本', error);
      }
    }
  }
});

// 监听存储变化并广播
storageService.onChanged((changes) => {
  if (changes.settings) {
    broadcastSettingsChange(changes.settings.newValue);
  }
});

// 设置处理器
setupMessageHandler();
setupCommandHandler();
setupMenuClickHandler();

console.log('Video Companion: Background Service Worker 已启动');
