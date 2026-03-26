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

  // 创建浏览器右键菜单
  chrome.contextMenus.create({
    id: 'vc-play-by-link',
    title: '通过链接播放',
    contexts: ['page', 'video', 'link'],
  });
});

// 处理浏览器右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'vc-play-by-link' && tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'openVideoPlayer' });
    } catch {
      // 页面无 content script（如 chrome:// 页面），弹窗提示
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'public/icons/icon128.png',
        title: 'Video Companion',
        message: '当前页面不支持此功能，请在普通网页上使用',
      });
    }
  }
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
