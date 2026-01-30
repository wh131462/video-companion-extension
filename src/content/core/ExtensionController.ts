/**
 * 扩展控制器 - 管理扩展的启用/禁用状态
 */

import type { UserSettings } from '@shared/types';
import { videoEnhancer } from './VideoEnhancer';
import { setupKeyboardHandler, removeKeyboardHandler } from '../handlers/keyboard';

class ExtensionController {
  private keyboardHandlerActive = false;
  private enabled = false;

  isEnabled(): boolean {
    return this.enabled;
  }

  enable(settings: UserSettings): void {
    if (this.enabled) return;

    this.enabled = true;
    videoEnhancer.updateSettings(settings);
    videoEnhancer.start();

    if (settings.enableShortcuts && !this.keyboardHandlerActive) {
      setupKeyboardHandler();
      this.keyboardHandlerActive = true;
    }

    console.log('Video Companion: 已启用');
  }

  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    videoEnhancer.stop();

    if (this.keyboardHandlerActive) {
      removeKeyboardHandler();
      this.keyboardHandlerActive = false;
    }

    console.log('Video Companion: 已禁用');
  }
}

export const extensionController = new ExtensionController();
