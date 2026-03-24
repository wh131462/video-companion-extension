/**
 * 视频右键菜单组件
 */

import { formatSpeed } from '@shared/utils';
import { SPEED_OPTIONS } from '@shared/constants';
import { showToast } from './Toast';
import { Icons } from './Icons';
import {
  pictureInPicture,
  fullscreen,
  webFullscreen,
  playbackSpeed,
  screenshot,
  download,
  loop,
  mute,
  hideControls,
} from '../features';
import { m3u8SourceCollector } from '../hls/M3u8SourceCollector';
import { hlsPlayerUI } from '../hls/HlsPlayerUI';
import { hlsContentDownloader } from '../hls/HlsContentDownloader';

interface MenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  submenu?: MenuItem[];
  checked?: boolean;
  divider?: boolean;
}

export interface ContextMenuOptions {
  onShowPanel?: () => void;
  isPanelVisible?: () => boolean;
}

export class ContextMenu {
  private element: HTMLDivElement;
  private video: HTMLVideoElement;
  private isVisible = false;
  private options: ContextMenuOptions;

  constructor(video: HTMLVideoElement, options: ContextMenuOptions = {}) {
    this.video = video;
    this.options = options;
    this.element = this.create();
    this.setupEventListeners();
  }

  private create(): HTMLDivElement {
    const menu = document.createElement('div');
    menu.className = 'vc-context-menu';
    document.body.appendChild(menu);
    return menu;
  }

  private setupEventListeners(): void {
    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target as Node)) {
        this.hide();
      }
    });

    // ESC 关闭菜单
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // 滚动时关闭菜单
    document.addEventListener('scroll', () => this.hide(), true);
  }

  private buildMenu(): MenuItem[] {
    const currentSpeed = this.video.playbackRate;
    const isLooping = this.video.loop;
    const isMuted = this.video.muted;
    const isFullscreen = !!document.fullscreenElement;
    const isPanelVisible = this.options.isPanelVisible?.() ?? false;

    const items: MenuItem[] = [];

    // 显示控制面板选项
    if (this.options.onShowPanel) {
      items.push({
        label: '控制面板',
        icon: Icons.showControls,
        checked: isPanelVisible,
        onClick: () => this.handleShowPanel(),
      });
      items.push({ divider: true });
    }

    // 隐藏/显示原生控制器
    items.push({
      label: this.video.controls ? '隐藏控制器' : '显示控制器',
      icon: this.video.controls ? Icons.showControls : Icons.hideControls,
      checked: !this.video.controls,
      onClick: () => this.handleHideControls(),
    });
    items.push({ divider: true });

    // 播放/暂停
    items.push({
      label: this.video.paused ? '播放' : '暂停',
      icon: this.video.paused ? Icons.play : Icons.pause,
      onClick: () => this.handlePlayPause(),
    });
    items.push({ divider: true });

    items.push(
      {
        label: `倍速: ${formatSpeed(currentSpeed)}`,
        icon: Icons.speed,
        submenu: SPEED_OPTIONS.map((speed: number) => ({
          label: formatSpeed(speed),
          checked: Math.abs(currentSpeed - speed) < 0.01,
          onClick: () => this.handleSpeedChange(speed),
        })),
      },
      { divider: true },
      {
        label: '循环播放',
        icon: Icons.loop,
        checked: isLooping,
        onClick: () => this.handleLoop(),
      },
      {
        label: '静音',
        icon: isMuted ? Icons.mute : Icons.volume,
        checked: isMuted,
        onClick: () => this.handleMute(),
      },
      { divider: true },
      {
        label: '画中画',
        icon: Icons.pip,
        onClick: () => this.handlePiP(),
      },
      {
        label: isFullscreen ? '退出全屏' : '全屏',
        icon: Icons.fullscreen,
        onClick: () => this.handleFullscreen(),
      },
      {
        label: '网页全屏',
        icon: Icons.webFullscreen,
        onClick: () => this.handleWebFullscreen(),
      },
      { divider: true },
      {
        label: '截图',
        icon: Icons.screenshot,
        onClick: () => this.handleScreenshot(),
      }
    );

    // 下载（自动判断：有 m3u8 源走 HLS 下载，否则普通下载）
    const m3u8Sources = m3u8SourceCollector.getSources();
    if (m3u8Sources.length > 1) {
      items.push({
        label: '下载视频',
        icon: Icons.download,
        submenu: m3u8Sources.map((source) => ({
          label: this.truncateUrl(source.url, 40),
          onClick: () => this.handleM3u8Download(source.url),
        })),
      });
    } else {
      items.push({
        label: '下载视频',
        icon: Icons.download,
        onClick: () => this.handleDownload(),
      });
    }

    // HLS 播放器入口
    items.push(
      { divider: true },
      {
        label: '通过链接播放',
        icon: Icons.hls,
        onClick: () => this.handlePlayM3u8(),
      }
    );

    return items;
  }

  private renderMenu(): void {
    const items = this.buildMenu();
    this.element.innerHTML = '';

    items.forEach((item) => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'vc-menu-divider';
        this.element.appendChild(divider);
        return;
      }

      const menuItem = document.createElement('div');
      menuItem.className = 'vc-menu-item';
      if (item.checked) {
        menuItem.classList.add('vc-menu-item-checked');
      }

      // 图标
      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'vc-menu-icon';
        iconSpan.innerHTML = item.icon;
        menuItem.appendChild(iconSpan);
      }

      // 标签
      if (item.label) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'vc-menu-label';
        labelSpan.textContent = item.label;
        menuItem.appendChild(labelSpan);
      }

      // 对钩（放在右侧）
      if (item.checked && !item.submenu) {
        const checkSpan = document.createElement('span');
        checkSpan.className = 'vc-menu-check';
        checkSpan.innerHTML = '✓';
        menuItem.appendChild(checkSpan);
      }

      // 子菜单箭头
      if (item.submenu) {
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'vc-menu-arrow';
        arrowSpan.innerHTML = '›';
        menuItem.appendChild(arrowSpan);

        // 创建子菜单
        const submenu = this.createSubmenu(item.submenu);
        menuItem.appendChild(submenu);
        menuItem.classList.add('vc-menu-item-has-submenu');
      }

      if (item.onClick) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          item.onClick!();
          this.hide();
        });
      }

      this.element.appendChild(menuItem);
    });
  }

  private createSubmenu(items: MenuItem[]): HTMLDivElement {
    const submenu = document.createElement('div');
    submenu.className = 'vc-submenu';

    items.forEach((item) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'vc-menu-item';
      if (item.checked) {
        menuItem.classList.add('vc-menu-item-checked');
      }

      const labelSpan = document.createElement('span');
      labelSpan.className = 'vc-menu-label';
      labelSpan.textContent = item.label || '';
      menuItem.appendChild(labelSpan);

      // 子菜单项的对钩
      if (item.checked) {
        const checkSpan = document.createElement('span');
        checkSpan.className = 'vc-menu-check';
        checkSpan.innerHTML = '✓';
        menuItem.appendChild(checkSpan);
      }

      if (item.onClick) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          item.onClick!();
          this.hide();
        });
      }

      submenu.appendChild(menuItem);
    });

    return submenu;
  }

  show(x: number, y: number): void {
    this.renderMenu();

    // 全屏模式下，将菜单添加到全屏元素内部；否则添加到 body
    const fullscreenElement = document.fullscreenElement;
    if (fullscreenElement) {
      if (!fullscreenElement.contains(this.element)) {
        fullscreenElement.appendChild(this.element);
      }
    } else {
      // 非全屏模式：确保菜单在 body 中
      if (this.element.parentElement !== document.body) {
        document.body.appendChild(this.element);
      }
    }

    // 先显示以获取尺寸
    this.element.style.visibility = 'hidden';
    this.element.style.display = 'block';

    const menuRect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 调整位置防止超出视口
    let finalX = x;
    let finalY = y;

    if (x + menuRect.width > viewportWidth) {
      finalX = viewportWidth - menuRect.width - 10;
    }

    if (y + menuRect.height > viewportHeight) {
      finalY = viewportHeight - menuRect.height - 10;
    }

    this.element.style.left = `${finalX}px`;
    this.element.style.top = `${finalY}px`;
    this.element.style.visibility = 'visible';
    this.isVisible = true;
  }

  hide(): void {
    this.element.style.display = 'none';
    this.isVisible = false;
  }

  isMenuVisible(): boolean {
    return this.isVisible;
  }

  // === 功能处理方法 ===

  private handleShowPanel(): void {
    this.options.onShowPanel?.();
  }

  private handleSpeedChange(speed: number): void {
    playbackSpeed.setSpeed(this.video, speed);
    showToast(`播放速度: ${formatSpeed(speed)}`);
  }

  private handlePiP(): void {
    pictureInPicture.toggle(this.video).catch((error) => {
      showToast(error.message);
    });
  }

  private handleFullscreen(): void {
    fullscreen.toggle(this.video).catch((error) => {
      showToast(error.message);
    });
  }

  private handleWebFullscreen(): void {
    const isActive = webFullscreen.toggle(this.video);
    showToast(isActive ? '已进入网页全屏' : '已退出网页全屏');
  }

  private handleDownload(): void {
    try {
      // 优先使用 HLS 下载
      if (m3u8SourceCollector.hasSources()) {
        const sources = m3u8SourceCollector.getSources();
        hlsContentDownloader.download(sources[0]!.url);
        return;
      }

      download.download(this.video);
      showToast('开始下载视频');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '下载失败');
    }
  }

  private handleScreenshot(): void {
    try {
      screenshot.capture(this.video);
      showToast('截图已保存');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '截图失败');
    }
  }

  private handleLoop(): void {
    const isActive = loop.toggle(this.video);
    showToast(isActive ? '循环播放已开启' : '循环播放已关闭');
  }

  private handleMute(): void {
    const isMuted = mute.toggle(this.video);
    showToast(isMuted ? '已静音' : '已取消静音');
  }

  private handleHideControls(): void {
    const isHidden = hideControls.toggle(this.video);
    showToast(isHidden ? '已隐藏原生控制器' : '已显示原生控制器');
  }

  private handlePlayPause(): void {
    if (this.video.paused) {
      this.video.play();
      showToast('播放');
    } else {
      this.video.pause();
      showToast('暂停');
    }
  }

  private handleM3u8Download(url: string): void {
    hlsContentDownloader.download(url);
  }

  private handlePlayM3u8(): void {
    hlsPlayerUI.show();
  }

  private truncateUrl(url: string, maxLen: number): string {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen - 3) + '...';
  }

  destroy(): void {
    this.element.remove();
  }
}
