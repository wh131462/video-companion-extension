/**
 * 消息处理器
 */

import type { Message, MessageResponse, UserSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { sendMessage } from '@shared/utils';
import { videoEnhancer } from '../core/VideoEnhancer';
import { extensionController } from '../core/ExtensionController';
import { showToast } from '../ui/Toast';
import { pictureInPicture, fullscreen, playbackSpeed } from '../features';

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
      handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('Video Companion: 消息处理错误', error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // 保持消息通道开放
    }
  );
}

async function handleMessage(message: Message): Promise<MessageResponse> {
  const video = videoEnhancer.getFirstVideo();

  switch (message.action) {
    case 'togglePanel':
      videoEnhancer.toggleAllPanels();
      return { success: true };

    case 'togglePiP':
      if (video) {
        await pictureInPicture.toggle(video);
      }
      return { success: true };

    case 'toggleFullscreen':
      if (video) {
        await fullscreen.toggle(video);
      }
      return { success: true };

    case 'screenshot':
      if (video) {
        const { screenshot } = await import('../features');
        screenshot.capture(video);
        showToast('截图已保存');
      }
      return { success: true };

    case 'setSpeed':
      if (video && message.speed !== undefined) {
        const speed = playbackSpeed.setSpeed(video, message.speed);
        showToast(`播放速度: ${speed}x`);
        videoEnhancer.getPanel(video)?.updateSpeedDisplay(speed);
      }
      return { success: true };

    case 'speedUp':
      if (video) {
        const speed = playbackSpeed.increaseSpeed(video);
        showToast(`播放速度: ${speed.toFixed(2)}x`);
        videoEnhancer.getPanel(video)?.updateSpeedDisplay(speed);
      }
      return { success: true };

    case 'speedDown':
      if (video) {
        const speed = playbackSpeed.decreaseSpeed(video);
        showToast(`播放速度: ${speed.toFixed(2)}x`);
        videoEnhancer.getPanel(video)?.updateSpeedDisplay(speed);
      }
      return { success: true };

    case 'settingsChanged':
      if (message.settings) {
        videoEnhancer.updateSettings(message.settings as UserSettings);
      }
      return { success: true };

    case 'extensionEnabled': {
      // 重新获取最新设置并启用
      const response = await sendMessage<{ success: boolean; data?: UserSettings }>({ action: 'getSettings' });
      const settings = response?.data || DEFAULT_SETTINGS;
      extensionController.enable(settings);
      showToast('Video Companion 已启用');
      return { success: true };
    }

    case 'extensionDisabled':
      extensionController.disable();
      showToast('Video Companion 已禁用');
      return { success: true };

    default:
      return { success: false, error: 'Unknown action' };
  }
}
