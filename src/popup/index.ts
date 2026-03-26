/**
 * Video Companion - Popup 脚本
 */

// 抑制开发模式下的 HMR WebSocket 错误（Chrome 扩展 popup 不支持 HMR）
if (import.meta.env.DEV) {
  window.addEventListener('error', (e) => {
    if (e.message?.includes('WebSocket')) {
      e.preventDefault();
    }
  });
}

// DOM 元素
const versionEl = document.getElementById('version') as HTMLSpanElement;
const panelToggle = document.getElementById('panel-toggle') as HTMLInputElement;
const contextMenuToggle = document.getElementById('context-menu-toggle') as HTMLInputElement;
const videoInfo = document.getElementById('video-info') as HTMLDivElement;
const videoCount = document.getElementById('video-count') as HTMLSpanElement;

// 初始化
async function init(): Promise<void> {
  // 显示版本号
  const manifest = chrome.runtime.getManifest();
  versionEl.textContent = `v${manifest.version}`;

  // 获取当前设置
  const { settings } = await chrome.storage.local.get('settings');
  const showPanel = settings?.showPanel ?? true;
  const showContextMenu = settings?.showContextMenu ?? true;

  // 更新 UI 状态
  panelToggle.checked = showPanel;
  contextMenuToggle.checked = showContextMenu;

  // 获取当前标签页的视频数量
  await updateVideoCount();
}

// 获取当前标签页的视频数量
async function updateVideoCount(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      videoCount.textContent = '无法获取页面信息';
      videoInfo.classList.add('no-video');
      return;
    }

    // 向 content script 发送消息获取视频数量
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoCount' });
    const total = response?.count ?? 0;

    if (total === 0) {
      videoCount.textContent = '当前页面没有视频';
    } else {
      videoCount.textContent = `检测到 ${total} 个视频`;
    }
  } catch {
    videoCount.textContent = '当前页面没有视频';
  }
}

// 打开视频播放器
async function openVideoPlayer(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, { action: 'openVideoPlayer' });
    window.close();
  } catch {
    // 页面无法通信时忽略
  }
}

// 保存设置并广播
async function saveAndBroadcast(key: string, value: boolean): Promise<void> {
  // 更新存储
  const { settings = {} } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({
    settings: { ...settings, [key]: value },
  });

  // 广播设置变化到所有标签页
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'settingsChanged',
          settings: { [key]: value },
        });
      } catch {
        // 忽略无法连接的标签页
      }
    }
  }
}

// 事件监听

// 控制面板开关
panelToggle.addEventListener('change', async () => {
  await saveAndBroadcast('showPanel', panelToggle.checked);
});

// 右键菜单开关
contextMenuToggle.addEventListener('change', async () => {
  await saveAndBroadcast('showContextMenu', contextMenuToggle.checked);
});

// 视频信息区域 → 打开播放器
videoInfo.addEventListener('click', () => {
  openVideoPlayer();
});

// 初始化
init();
