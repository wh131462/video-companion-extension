/**
 * Video Companion - Background Service Worker 入口
 */

import { storageService } from './services/storage';
import { setupMessageHandler, broadcastSettingsChange, broadcastExtensionState } from './handlers/message';
import { setupCommandHandler } from './handlers/command';

// 更新扩展图标状态
async function updateIconState(enabled: boolean): Promise<void> {
  if (enabled) {
    // 启用状态：清除 badge，恢复标题
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'Video Companion - 点击禁用' });
  } else {
    // 禁用状态：显示 OFF badge，更新标题
    await chrome.action.setBadgeText({ text: 'OFF' });
    await chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    await chrome.action.setTitle({ title: 'Video Companion - 点击启用' });
  }
}

// 初始化图标状态
async function initIconState(): Promise<void> {
  const settings = await storageService.getSettings();
  await updateIconState(settings.enabled);
}

// 扩展程序安装或更新
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await storageService.initializeDefaults();
    console.log('Video Companion: 已安装');
  } else if (details.reason === 'update') {
    await storageService.migrateSettings();
    console.log('Video Companion: 已更新到版本', chrome.runtime.getManifest().version);
  }

  // 初始化图标状态
  await initIconState();
});

// 处理来自 popup 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'updateIconState') {
    updateIconState(message.enabled);
    sendResponse({ success: true });
  } else if (message.action === 'broadcastExtensionState') {
    broadcastExtensionState(message.enabled);
    sendResponse({ success: true });
  }
  return true;
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

// Service Worker 启动时初始化图标状态
initIconState();

console.log('Video Companion: Background Service Worker 已启动');
