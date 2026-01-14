/**
 * Toast 提示组件
 */

import { CSS_CLASSES, TOAST_DURATION } from '@shared/constants';

export class Toast {
  private element: HTMLDivElement | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  show(message: string, duration: number = TOAST_DURATION): void {
    this.hide();

    this.element = document.createElement('div');
    this.element.className = CSS_CLASSES.toast;
    this.element.textContent = message;
    document.body.appendChild(this.element);

    // 触发重排以启用动画
    requestAnimationFrame(() => {
      this.element?.classList.add(CSS_CLASSES.toastShow);
    });

    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (this.element) {
      this.element.classList.remove(CSS_CLASSES.toastShow);
      const el = this.element;
      setTimeout(() => el.remove(), 300);
      this.element = null;
    }
  }
}

// 单例实例
export const toast = new Toast();

// 便捷函数
export function showToast(message: string, duration?: number): void {
  toast.show(message, duration);
}
