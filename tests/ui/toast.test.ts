/**
 * Toast 组件测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Toast } from '../../src/content/ui/Toast';

describe('Toast', () => {
  let toast: Toast;

  beforeEach(() => {
    toast = new Toast();
    vi.useFakeTimers();
  });

  afterEach(() => {
    toast.hide();
    vi.useRealTimers();
  });

  describe('show', () => {
    it('should create toast element', () => {
      toast.show('Test message');
      const element = document.querySelector('.vc-toast');
      expect(element).not.toBeNull();
      expect(element?.textContent).toBe('Test message');
    });

    it('should remove existing toast before showing new one', () => {
      toast.show('First message');
      toast.show('Second message');
      const elements = document.querySelectorAll('.vc-toast');
      expect(elements.length).toBe(1);
      expect(elements[0]?.textContent).toBe('Second message');
    });
  });

  describe('hide', () => {
    it('should remove toast element', () => {
      toast.show('Test message');
      toast.hide();
      vi.advanceTimersByTime(400);
      const element = document.querySelector('.vc-toast');
      expect(element).toBeNull();
    });
  });

  describe('auto hide', () => {
    it('should auto hide after default duration', () => {
      toast.show('Test message');
      expect(document.querySelector('.vc-toast')).not.toBeNull();

      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(400);

      expect(document.querySelector('.vc-toast')).toBeNull();
    });

    it('should auto hide after custom duration', () => {
      toast.show('Test message', 1000);

      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(400);

      expect(document.querySelector('.vc-toast')).toBeNull();
    });
  });
});
