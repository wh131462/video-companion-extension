/**
 * 控制面板组件
 */

import { CSS_CLASSES, PANEL_HIDE_DELAY } from '@shared/constants';
import { formatSpeed } from '@shared/utils';
import { SpeedMenu } from './SpeedMenu';
import { Draggable } from './Draggable';
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

export interface ControlPanelOptions {
  video: HTMLVideoElement;
  autoHide?: boolean;
  hideDelay?: number;
}

interface ButtonConfig {
  icon: string;
  title: string;
  onClick: () => void;
  className?: string;
}

export class ControlPanel {
  private element: HTMLDivElement;
  private video: HTMLVideoElement;
  private speedMenu: SpeedMenu;
  private speedButton: HTMLButtonElement | null = null;
  private loopButton: HTMLButtonElement | null = null;
  private muteButton: HTMLButtonElement | null = null;
  private hideControlsButton: HTMLButtonElement | null = null;
  private draggable: Draggable;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoHide: boolean;
  private hideDelay: number;

  // 进度条相关
  private progressSection: HTMLDivElement | null = null;
  private progressBar: HTMLDivElement | null = null;
  private progressFilled: HTMLDivElement | null = null;
  private progressBuffer: HTMLDivElement | null = null;
  private currentTimeDisplay: HTMLSpanElement | null = null;
  private durationDisplay: HTMLSpanElement | null = null;
  private volumeSlider: HTMLInputElement | null = null;
  private volumeIcon: HTMLButtonElement | null = null;
  private playPauseBtn: HTMLButtonElement | null = null;
  private isDraggingProgress = false;
  private isControlsHidden = false;

  constructor(options: ControlPanelOptions) {
    this.video = options.video;
    this.autoHide = options.autoHide ?? true;
    this.hideDelay = options.hideDelay ?? PANEL_HIDE_DELAY;

    this.speedMenu = new SpeedMenu({
      onSpeedChange: (speed) => this.handleSpeedChange(speed),
      getCurrentSpeed: () => this.video.playbackRate,
    });

    this.element = this.create();
    this.draggable = new Draggable(this.element, {
      excludeSelector: `.${CSS_CLASSES.speedMenu}, .vc-progress-bar, .vc-volume-slider, .vc-volume-icon`,
    });

    this.setupEventListeners();
  }

  private create(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = CSS_CLASSES.panel;

    // 进度条区域（默认隐藏）
    this.progressSection = this.createProgressSection();
    panel.appendChild(this.progressSection);

    // 按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = CSS_CLASSES.buttonContainer;

    // === 重新排序的按钮 ===

    // 1. 倍速按钮（最常用）
    this.speedButton = this.createButton({
      icon: formatSpeed(this.video.playbackRate),
      title: '倍速',
      onClick: () => this.speedMenu.toggle(),
      className: CSS_CLASSES.speedButton,
    });
    buttonContainer.appendChild(this.speedButton);
    buttonContainer.appendChild(this.speedMenu.getElement());

    // 2. 循环按钮
    this.loopButton = this.createButton({
      icon: Icons.loop,
      title: '循环',
      onClick: () => this.handleLoop(),
    });
    if (this.video.loop) {
      this.loopButton.classList.add(CSS_CLASSES.active);
    }
    buttonContainer.appendChild(this.loopButton);

    // 3. 画中画按钮
    buttonContainer.appendChild(this.createButton({
      icon: Icons.pip,
      title: '画中画',
      onClick: () => this.handlePiP(),
    }));

    // 4. 全屏按钮
    buttonContainer.appendChild(this.createButton({
      icon: Icons.fullscreen,
      title: '全屏',
      onClick: () => this.handleFullscreen(),
    }));

    // 5. 网页全屏按钮
    buttonContainer.appendChild(this.createButton({
      icon: Icons.webFullscreen,
      title: '网页全屏',
      onClick: () => this.handleWebFullscreen(),
    }));

    // 6. 静音按钮
    this.muteButton = this.createButton({
      icon: this.video.muted ? Icons.mute : Icons.volume,
      title: '静音',
      onClick: () => this.handleMute(),
    });
    buttonContainer.appendChild(this.muteButton);

    // 7. 截图按钮
    buttonContainer.appendChild(this.createButton({
      icon: Icons.screenshot,
      title: '截图',
      onClick: () => this.handleScreenshot(),
    }));

    // 8. 下载按钮
    buttonContainer.appendChild(this.createButton({
      icon: Icons.download,
      title: '下载',
      onClick: () => this.handleDownload(),
    }));

    // 9. 隐藏原生控制器按钮
    this.hideControlsButton = this.createButton({
      icon: this.video.controls ? Icons.showControls : Icons.hideControls,
      title: '隐藏控制器',
      onClick: () => this.handleHideControls(),
    });
    buttonContainer.appendChild(this.hideControlsButton);

    panel.appendChild(buttonContainer);
    return panel;
  }

  private createProgressSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'vc-progress-section';

    // 时间行（进度条上方）：左侧当前时间，右侧总时长
    const timeRow = document.createElement('div');
    timeRow.className = 'vc-time-row';

    this.currentTimeDisplay = document.createElement('span');
    this.currentTimeDisplay.className = 'vc-time-current';
    this.currentTimeDisplay.textContent = '0:00';

    this.durationDisplay = document.createElement('span');
    this.durationDisplay.className = 'vc-time-duration';
    this.durationDisplay.textContent = '0:00';

    timeRow.appendChild(this.currentTimeDisplay);
    timeRow.appendChild(this.durationDisplay);

    // 进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.className = 'vc-progress-container';

    // 进度条轨道
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'vc-progress-bar';

    // 缓冲进度
    this.progressBuffer = document.createElement('div');
    this.progressBuffer.className = 'vc-progress-buffer';

    // 已播放进度
    this.progressFilled = document.createElement('div');
    this.progressFilled.className = 'vc-progress-filled';

    this.progressBar.appendChild(this.progressBuffer);
    this.progressBar.appendChild(this.progressFilled);
    progressContainer.appendChild(this.progressBar);

    // 控制行：播放控制 + 音量
    const controlsRow = document.createElement('div');
    controlsRow.className = 'vc-progress-controls';

    // 左侧：播放控制按钮组
    const playbackControls = document.createElement('div');
    playbackControls.className = 'vc-playback-controls';

    // 快退按钮
    const rewindBtn = document.createElement('button');
    rewindBtn.className = 'vc-playback-btn';
    rewindBtn.innerHTML = Icons.rewind;
    rewindBtn.title = '快退 10 秒';
    rewindBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.video.currentTime = Math.max(0, this.video.currentTime - 10);
    });

    // 播放/暂停按钮
    this.playPauseBtn = document.createElement('button');
    this.playPauseBtn.className = 'vc-playback-btn vc-play-pause';
    this.playPauseBtn.innerHTML = this.video.paused ? Icons.play : Icons.pause;
    this.playPauseBtn.title = '播放/暂停';
    this.playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
    });

    // 快进按钮
    const forwardBtn = document.createElement('button');
    forwardBtn.className = 'vc-playback-btn';
    forwardBtn.innerHTML = Icons.forward;
    forwardBtn.title = '快进 10 秒';
    forwardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 10);
    });

    playbackControls.appendChild(rewindBtn);
    playbackControls.appendChild(this.playPauseBtn);
    playbackControls.appendChild(forwardBtn);

    // 音量控制
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'vc-volume-container';

    this.volumeIcon = document.createElement('button');
    this.volumeIcon.className = 'vc-volume-icon';
    this.volumeIcon.innerHTML = this.getVolumeIcon(this.video.volume, this.video.muted);

    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.className = 'vc-volume-slider';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '1';
    this.volumeSlider.step = '0.05';
    this.volumeSlider.value = this.video.muted ? '0' : String(this.video.volume);

    volumeContainer.appendChild(this.volumeIcon);
    volumeContainer.appendChild(this.volumeSlider);

    controlsRow.appendChild(playbackControls);
    controlsRow.appendChild(volumeContainer);

    section.appendChild(timeRow);
    section.appendChild(progressContainer);
    section.appendChild(controlsRow);

    return section;
  }

  private createButton(config: ButtonConfig): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = CSS_CLASSES.button;
    if (config.className) {
      button.className += ` ${config.className}`;
    }
    button.innerHTML = config.icon;

    const tooltip = document.createElement('span');
    tooltip.className = CSS_CLASSES.tooltip;
    tooltip.textContent = config.title;
    button.appendChild(tooltip);

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      config.onClick();
    });
    return button;
  }

  private setupEventListeners(): void {
    // 视频事件
    this.video.addEventListener('enterpictureinpicture', () => {
      showToast('已进入画中画模式');
    });

    this.video.addEventListener('leavepictureinpicture', () => {
      showToast('已退出画中画模式');
    });

    // 进度条事件
    this.progressBar?.addEventListener('mousedown', (e) => this.handleProgressMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleProgressMouseMove(e));
    document.addEventListener('mouseup', () => this.handleProgressMouseUp());

    // 视频时间更新
    this.video.addEventListener('timeupdate', () => this.updateProgress());
    this.video.addEventListener('loadedmetadata', () => this.updateProgress());
    this.video.addEventListener('progress', () => this.updateBuffer());

    // 播放状态变化
    this.video.addEventListener('play', () => this.updatePlayPauseIcon());
    this.video.addEventListener('pause', () => this.updatePlayPauseIcon());

    // 音量控制
    this.volumeSlider?.addEventListener('input', () => this.handleVolumeChange());
    this.volumeIcon?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleVolumeMute();
    });
    this.video.addEventListener('volumechange', () => this.updateVolumeDisplay());

    // 自动隐藏
    if (this.autoHide) {
      this.video.addEventListener('mouseenter', () => this.show());
      this.video.addEventListener('mousemove', () => this.show());
      this.element.addEventListener('mouseenter', () => this.cancelHide());
      this.element.addEventListener('mouseleave', () => this.scheduleHide());
    }
  }

  // === 进度条相关方法 ===

  private handleProgressMouseDown(e: MouseEvent): void {
    this.isDraggingProgress = true;
    this.seekToPosition(e);
  }

  private handleProgressMouseMove(e: MouseEvent): void {
    if (this.isDraggingProgress) {
      this.seekToPosition(e);
    }
  }

  private handleProgressMouseUp(): void {
    this.isDraggingProgress = false;
  }

  private seekToPosition(e: MouseEvent): void {
    if (!this.progressBar) return;
    const rect = this.progressBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = pos * this.video.duration;

    if (!isNaN(time) && isFinite(time)) {
      this.video.currentTime = time;
      this.updateProgress();
    }
  }

  private updateProgress(): void {
    if (!this.isControlsHidden) return;

    const current = this.video.currentTime;
    const duration = this.video.duration;

    if (!isNaN(duration) && duration > 0) {
      const percent = (current / duration) * 100;
      if (this.progressFilled) {
        this.progressFilled.style.width = `${percent}%`;
      }
      if (this.currentTimeDisplay) {
        this.currentTimeDisplay.textContent = this.formatTime(current);
      }
      if (this.durationDisplay) {
        this.durationDisplay.textContent = this.formatTime(duration);
      }
    }
  }

  private updateBuffer(): void {
    if (!this.isControlsHidden || !this.progressBuffer) return;

    const duration = this.video.duration;
    if (!isNaN(duration) && duration > 0 && this.video.buffered.length > 0) {
      const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
      const percent = (bufferedEnd / duration) * 100;
      this.progressBuffer.style.width = `${percent}%`;
    }
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // === 音量相关方法 ===

  private handleVolumeChange(): void {
    if (!this.volumeSlider) return;
    const volume = parseFloat(this.volumeSlider.value);
    this.video.volume = volume;
    this.video.muted = volume === 0;
    this.updateVolumeDisplay();
  }

  private toggleVolumeMute(): void {
    this.video.muted = !this.video.muted;
    this.updateVolumeDisplay();
  }

  private updateVolumeDisplay(): void {
    const volume = this.video.muted ? 0 : this.video.volume;

    if (this.volumeSlider) {
      this.volumeSlider.value = String(volume);
      const percent = volume * 100;
      this.volumeSlider.style.setProperty('--volume-percent', `${percent}%`);
    }

    if (this.volumeIcon) {
      this.volumeIcon.innerHTML = this.getVolumeIcon(this.video.volume, this.video.muted);
    }

    // 同步更新静音按钮
    if (this.muteButton) {
      const svg = this.muteButton.querySelector('svg');
      if (svg) {
        svg.outerHTML = this.video.muted ? Icons.mute : Icons.volume;
      }
    }
  }

  private getVolumeIcon(volume: number, muted: boolean): string {
    if (muted || volume === 0) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
      </svg>`;
    } else if (volume < 0.5) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`;
    } else {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>`;
    }
  }

  private updatePlayPauseIcon(): void {
    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML = this.video.paused ? Icons.play : Icons.pause;
    }
  }

  // === 按钮处理方法 ===

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

  private handleSpeedChange(speed: number): void {
    playbackSpeed.setSpeed(this.video, speed);
    if (this.speedButton) {
      this.speedButton.innerHTML = formatSpeed(speed);
    }
    showToast(`播放速度: ${formatSpeed(speed)}`);
  }

  private handleDownload(): void {
    try {
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
    this.loopButton?.classList.toggle(CSS_CLASSES.active, isActive);
    showToast(isActive ? '循环播放已开启' : '循环播放已关闭');
  }

  private handleMute(): void {
    const isMuted = mute.toggle(this.video);
    if (this.muteButton) {
      const svg = this.muteButton.querySelector('svg');
      if (svg) {
        svg.outerHTML = isMuted ? Icons.mute : Icons.volume;
      }
    }
    this.updateVolumeDisplay();
    showToast(isMuted ? '已静音' : '已取消静音');
  }

  private handleHideControls(): void {
    const isHidden = hideControls.toggle(this.video);
    this.isControlsHidden = isHidden;

    if (this.hideControlsButton) {
      const svg = this.hideControlsButton.querySelector('svg');
      if (svg) {
        svg.outerHTML = isHidden ? Icons.hideControls : Icons.showControls;
      }
      this.hideControlsButton.classList.toggle(CSS_CLASSES.active, isHidden);
    }

    // 显示/隐藏进度条区域
    if (this.progressSection) {
      this.progressSection.classList.toggle('vc-show', isHidden);
      if (isHidden) {
        this.updateProgress();
        this.updateBuffer();
        this.updateVolumeDisplay();
      }
    }

    showToast(isHidden ? '已隐藏原生控制器' : '已显示原生控制器');
  }

  show(): void {
    this.cancelHide();
    this.element.classList.add(CSS_CLASSES.visible);
    this.scheduleHide();
  }

  hide(): void {
    this.element.classList.remove(CSS_CLASSES.visible);
  }

  private scheduleHide(): void {
    if (!this.autoHide) return;
    this.cancelHide();
    this.hideTimeout = setTimeout(() => this.hide(), this.hideDelay);
  }

  private cancelHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  updateSpeedDisplay(speed: number): void {
    if (this.speedButton) {
      this.speedButton.innerHTML = formatSpeed(speed);
    }
    this.speedMenu.updateActiveSpeed(speed);
  }

  getElement(): HTMLDivElement {
    return this.element;
  }

  destroy(): void {
    this.cancelHide();
    this.draggable.destroy();
    this.element.remove();
  }
}
