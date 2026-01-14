/**
 * 右键菜单处理器
 */

import { SPEED_OPTIONS } from '@shared/constants';

export function setupContextMenus(): void {
  // 清除旧菜单
  chrome.contextMenus.removeAll(() => {
    // 画中画
    chrome.contextMenus.create({
      id: 'vc-pip',
      title: '画中画模式',
      contexts: ['video'],
    });

    // 截图
    chrome.contextMenus.create({
      id: 'vc-screenshot',
      title: '视频截图',
      contexts: ['video'],
    });

    // 速度菜单
    chrome.contextMenus.create({
      id: 'vc-speed-menu',
      title: '播放速度',
      contexts: ['video'],
    });

    // 速度子菜单
    SPEED_OPTIONS.forEach((speed) => {
      chrome.contextMenus.create({
        id: `vc-speed-${speed}`,
        parentId: 'vc-speed-menu',
        title: `${speed}x`,
        contexts: ['video'],
      });
    });
  });
}

export function setupMenuClickHandler(): void {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    const menuItemId = info.menuItemId.toString();

    try {
      if (menuItemId === 'vc-pip') {
        await chrome.tabs.sendMessage(tab.id, { action: 'togglePiP' });
      } else if (menuItemId === 'vc-screenshot') {
        await chrome.tabs.sendMessage(tab.id, { action: 'screenshot' });
      } else if (menuItemId.startsWith('vc-speed-')) {
        const speed = parseFloat(menuItemId.replace('vc-speed-', ''));
        await chrome.tabs.sendMessage(tab.id, { action: 'setSpeed', speed });
      }
    } catch (error) {
      console.error('Video Companion: 菜单操作失败', error);
    }
  });
}
