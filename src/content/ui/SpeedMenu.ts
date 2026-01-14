/**
 * 倍速菜单组件
 */

import { CSS_CLASSES, SPEED_OPTIONS } from '@shared/constants';
import { formatSpeed } from '@shared/utils';

export interface SpeedMenuOptions {
  onSpeedChange: (speed: number) => void;
  getCurrentSpeed: () => number;
}

export class SpeedMenu {
  private element: HTMLDivElement;
  private options: SpeedMenuOptions;

  constructor(options: SpeedMenuOptions) {
    this.options = options;
    this.element = this.create();
  }

  private create(): HTMLDivElement {
    const menu = document.createElement('div');
    menu.className = CSS_CLASSES.speedMenu;

    SPEED_OPTIONS.forEach(speed => {
      const item = document.createElement('div');
      item.className = CSS_CLASSES.speedItem;
      item.textContent = formatSpeed(speed);
      item.dataset.speed = String(speed);

      if (this.options.getCurrentSpeed() === speed) {
        item.classList.add(CSS_CLASSES.active);
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectSpeed(speed);
      });

      menu.appendChild(item);
    });

    return menu;
  }

  private selectSpeed(speed: number): void {
    // 更新活动状态
    this.element.querySelectorAll(`.${CSS_CLASSES.speedItem}`).forEach(item => {
      item.classList.remove(CSS_CLASSES.active);
      if ((item as HTMLElement).dataset.speed === String(speed)) {
        item.classList.add(CSS_CLASSES.active);
      }
    });

    this.options.onSpeedChange(speed);
    this.hide();
  }

  show(): void {
    this.element.classList.add(CSS_CLASSES.show);
  }

  hide(): void {
    this.element.classList.remove(CSS_CLASSES.show);
  }

  toggle(): void {
    this.element.classList.toggle(CSS_CLASSES.show);
  }

  isVisible(): boolean {
    return this.element.classList.contains(CSS_CLASSES.show);
  }

  updateActiveSpeed(speed: number): void {
    this.element.querySelectorAll(`.${CSS_CLASSES.speedItem}`).forEach(item => {
      const itemSpeed = parseFloat((item as HTMLElement).dataset.speed || '0');
      item.classList.toggle(CSS_CLASSES.active, itemSpeed === speed);
    });
  }

  getElement(): HTMLDivElement {
    return this.element;
  }
}
