/**
 * Video Companion - Background Service Worker 入口
 */

import { storageService } from './services/storage';
import { setupMessageHandler, broadcastSettingsChange, broadcastExtensionState } from './handlers/message';
import { setupCommandHandler } from './handlers/command';
import { setupContextMenus, setupMenuClickHandler } from './handlers/menu';

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

  // 设置右键菜单
  setupContextMenus();

  // 初始化图标状态
  await initIconState();
});

// 扩展程序图标点击 - 切换启用/禁用状态
chrome.action.onClicked.addListener(async () => {
  // 获取当前设置
  const settings = await storageService.getSettings();
  const newEnabled = !settings.enabled;

  // 更新设置
  await storageService.updateSettings({ enabled: newEnabled });

  // 更新图标状态
  await updateIconState(newEnabled);

  // 广播状态变化到所有标签页
  broadcastExtensionState(newEnabled);

  console.log(`Video Companion: ${newEnabled ? '已启用' : '已禁用'}`);
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

// Service Worker 启动时初始化图标状态
initIconState();

console.log('Video Companion: Background Service Worker 已启动');
