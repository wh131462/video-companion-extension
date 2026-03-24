/**
 * 视频增强器主类
 * 重构版本：使用 VideoRegistry 和 VideoLifecycleManager
 */

import type { UserSettings } from '@shared/types';
import { DEFAULT_SETTINGS, FEATURE_FLAGS } from '@shared/constants';
import { ControlPanel } from '../ui/ControlPanel';
import { ContextMenu } from '../ui/ContextMenu';
import { VideoScanner } from './VideoScanner';
import { VideoRegistry, videoRegistry } from './VideoRegistry';
import { VideoLifecycleManager } from './VideoLifecycleManager';
import {
  hasCustomControls,
  findVideoContainer,
  detectionCache,
  containerDetector,
} from '../utils/detectCustomControls';

/**
 * 检查点击位置是否在视频元素的可视范围内
 */
function isClickWithinVideo(e: MouseEvent, video: HTMLVideoElement): boolean {
  try {
    const rect = video.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  } catch {
    return false;
  }
}

export class VideoEnhancer {
  // 旧版组件（兼容层）
  private scanner: VideoScanner | null = null;

  // 新版组件
  private registry: VideoRegistry;
  private lifecycleManager: VideoLifecycleManager | null = null;

  // 旧版 Maps（当 FEATURE_FLAGS.USE_VIDEO_REGISTRY 为 false 时使用）
  private panels = new Map<HTMLVideoElement, ControlPanel>();
  private contextMenus = new Map<HTMLVideoElement, ContextMenu>();
  private contextMenuHandlers = new Map<HTMLVideoElement, (e: MouseEvent) => void>();
  private contextMenuTargets = new Map<HTMLVideoElement, HTMLElement>();
  private closedPanels = new Set<string>();
  private videoIdCounter = 0;

  private settings: UserSettings = DEFAULT_SETTINGS;

  constructor() {
    this.registry = videoRegistry;

    // 设置 GC 回调
    this.registry.onVideoCollected = (id) => {
      console.debug(`[Video Companion] Video ${id} was garbage collected`);
    };
  }

  // 获取或生成视频的唯一 ID
  private getVideoId(video: HTMLVideoElement): string {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      const state = this.registry.get(video);
      return state?.id || video.dataset.vcId || '';
    }

    // 旧版逻辑
    let id = video.dataset.vcId;
    if (!id) {
      id = `vc-video-${++this.videoIdCounter}`;
      video.dataset.vcId = id;
    }
    return id;
  }

  // 标记某个视频的面板为已关闭
  markPanelClosed(video: HTMLVideoElement): void {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      this.registry.markPanelClosed(video);
    } else {
      const id = this.getVideoId(video);
      this.closedPanels.add(id);
    }
  }

  // 检查某个视频的面板是否被关闭
  isPanelClosed(video: HTMLVideoElement): boolean {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      const state = this.registry.get(video);
      return state?.isPanelClosed ?? false;
    }

    const id = this.getVideoId(video);
    return this.closedPanels.has(id);
  }

  start(): void {
    if (FEATURE_FLAGS.USE_LIFECYCLE_MANAGER) {
      // 使用新版生命周期管理器
      this.lifecycleManager = new VideoLifecycleManager({
        onVideoAdded: (video) => this.enhanceVideo(video),
        onVideoRemoved: (video) => this.cleanupVideo(video),
        onVideoReplaced: (oldVideo, newVideo) => {
          this.cleanupVideo(oldVideo);
          this.enhanceVideo(newVideo);
        },
        onVideoResized: (video) => {
          // 视频尺寸变化时可能需要重新检测
          if (FEATURE_FLAGS.USE_DETECTION_CACHE) {
            detectionCache.invalidate(video);
          }
        },
      });
      this.lifecycleManager.start();
    } else {
      // 使用旧版扫描器
      this.scanner = new VideoScanner((video) => this.enhanceVideo(video));
      this.scanner.start();
    }
  }

  stop(): void {
    // 停止生命周期管理器或扫描器
    if (this.lifecycleManager) {
      this.lifecycleManager.stop();
      this.lifecycleManager = null;
    }
    if (this.scanner) {
      this.scanner.stop();
      this.scanner = null;
    }

    // 清理所有视频
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      this.registry.forEach((video, state) => {
        this.cleanupVideoState(video, state);
      });
    } else {
      // 旧版清理逻辑
      this.panels.forEach((panel) => panel.destroy());
      this.panels.clear();
      this.contextMenus.forEach((menu) => menu.destroy());
      this.contextMenus.clear();
      this.contextMenuHandlers.forEach((handler) => {
        document.removeEventListener('contextmenu', handler, true);
      });
      this.contextMenuHandlers.clear();
      this.contextMenuTargets.clear();
    }
  }

  /**
   * 清理单个视频的资源
   */
  private cleanupVideo(video: HTMLVideoElement): void {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      const state = this.registry.get(video);
      if (state) {
        this.cleanupVideoState(video, state);
        this.registry.unregister(video);
      }
    } else {
      // 旧版清理逻辑
      const panel = this.panels.get(video);
      if (panel) {
        panel.destroy();
        this.panels.delete(video);
      }

      const menu = this.contextMenus.get(video);
      if (menu) {
        menu.destroy();
        this.contextMenus.delete(video);
      }

      const handler = this.contextMenuHandlers.get(video);
      if (handler) {
        document.removeEventListener('contextmenu', handler, true);
        this.contextMenuHandlers.delete(video);
        this.contextMenuTargets.delete(video);
      }
    }

    // 清理缓存
    if (FEATURE_FLAGS.USE_DETECTION_CACHE) {
      detectionCache.invalidate(video);
    }
    if (FEATURE_FLAGS.USE_WEIGHTED_CONTAINER) {
      containerDetector.invalidate(video);
    }
  }

  /**
   * 清理视频状态（内部使用）
   */
  private cleanupVideoState(
    _video: HTMLVideoElement,
    state: ReturnType<VideoRegistry['get']>
  ): void {
    if (!state) return;

    // 销毁面板
    if (state.panel) {
      state.panel.destroy();
    }

    // 销毁右键菜单
    if (state.contextMenu) {
      state.contextMenu.destroy();
    }

    // 移除事件处理器
    if (state.eventHandler) {
      document.removeEventListener('contextmenu', state.eventHandler, true);
    }
  }

  updateSettings(settings: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.applySettings();
  }

  private enhanceVideo(video: HTMLVideoElement): void {
    // 检测是否有自定义控制器
    const hasCustom = hasCustomControls(video);
    const container = findVideoContainer(video);

    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      // 注册视频
      const state = this.registry.register(video, container);
      state.hasCustomControls = hasCustom;

      if (hasCustom) {
        this.setupContextMenuOnly(video, state);
      } else {
        this.setupFullEnhancement(video, state);
      }
    } else {
      // 旧版逻辑
      this.getVideoId(video);

      if (hasCustom) {
        this.setupContextMenuOnlyLegacy(video);
      } else {
        this.setupFullEnhancementLegacy(video);
      }
    }
  }

  /**
   * 仅设置右键菜单（自定义控制器视频）
   */
  private setupContextMenuOnly(
    video: HTMLVideoElement,
    state: NonNullable<ReturnType<VideoRegistry['get']>>
  ): void {
    if (!this.settings.showContextMenu) return;

    const contextMenu = new ContextMenu(video);
    const container = state.container;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('.vc-context-menu')) return;
      if (!container.contains(target) && !isClickWithinVideo(e, video)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      contextMenu.show(e.clientX, e.clientY);
    };

    document.addEventListener('contextmenu', handler, true);

    // 更新状态
    this.registry.setUI(video, undefined, contextMenu, handler);
  }

  /**
   * 设置完整增强（原生视频）
   */
  private setupFullEnhancement(
    video: HTMLVideoElement,
    state: NonNullable<ReturnType<VideoRegistry['get']>>
  ): void {
    let panel: ControlPanel | undefined;

    // 创建控制面板
    if (this.settings.showPanel) {
      panel = new ControlPanel({
        video,
        autoHide: this.settings.autoHidePanel,
        hideDelay: this.settings.autoHideDelay,
        onClose: () => this.markPanelClosed(video),
      });

      // 检查是否被用户手动关闭过
      if (state.isPanelClosed) {
        panel.getElement().style.display = 'none';
      } else {
        panel.show();
      }

      // 应用默认速度
      if (this.settings.defaultSpeed !== 1) {
        video.playbackRate = this.settings.defaultSpeed;
        panel.updateSpeedDisplay(this.settings.defaultSpeed);
      }
    }

    // 创建右键菜单
    let contextMenu: ContextMenu | undefined;
    let handler: ((e: MouseEvent) => void) | undefined;

    if (this.settings.showContextMenu) {
      contextMenu = new ContextMenu(video, {
        onShowPanel: () => this.togglePanel(video),
        isPanelVisible: () => this.isPanelVisible(video),
      });

      const ctxContainer = state.container;
      handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target || target.closest('.vc-context-menu')) return;
        if (!ctxContainer.contains(target) && !isClickWithinVideo(e, video)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        contextMenu!.show(e.clientX, e.clientY);
      };

      document.addEventListener('contextmenu', handler, true);
    }

    // 更新状态
    this.registry.setUI(video, panel, contextMenu, handler);
  }

  /**
   * 旧版：仅设置右键菜单
   */
  private setupContextMenuOnlyLegacy(video: HTMLVideoElement): void {
    if (!this.settings.showContextMenu) return;

    const contextMenu = new ContextMenu(video);
    this.contextMenus.set(video, contextMenu);

    const eventTarget = findVideoContainer(video);
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('.vc-context-menu')) return;
      if (!eventTarget.contains(target) && !isClickWithinVideo(e, video)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      contextMenu.show(e.clientX, e.clientY);
    };

    document.addEventListener('contextmenu', handler, true);
    this.contextMenuHandlers.set(video, handler);
    this.contextMenuTargets.set(video, eventTarget);
  }

  /**
   * 旧版：设置完整增强
   */
  private setupFullEnhancementLegacy(video: HTMLVideoElement): void {
    // 创建控制面板
    if (this.settings.showPanel) {
      const panel = new ControlPanel({
        video,
        autoHide: this.settings.autoHidePanel,
        hideDelay: this.settings.autoHideDelay,
        onClose: () => this.markPanelClosed(video),
      });

      this.panels.set(video, panel);

      if (this.isPanelClosed(video)) {
        panel.getElement().style.display = 'none';
      } else {
        panel.show();
      }

      if (this.settings.defaultSpeed !== 1) {
        video.playbackRate = this.settings.defaultSpeed;
        panel.updateSpeedDisplay(this.settings.defaultSpeed);
      }
    }

    // 创建右键菜单
    if (this.settings.showContextMenu) {
      const contextMenu = new ContextMenu(video, {
        onShowPanel: () => this.togglePanel(video),
        isPanelVisible: () => this.isPanelVisible(video),
      });
      this.contextMenus.set(video, contextMenu);

      const eventTarget = findVideoContainer(video);
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target || target.closest('.vc-context-menu')) return;
        if (!eventTarget.contains(target) && !isClickWithinVideo(e, video)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        contextMenu.show(e.clientX, e.clientY);
      };
      document.addEventListener('contextmenu', handler, true);
      this.contextMenuHandlers.set(video, handler);
      this.contextMenuTargets.set(video, eventTarget);
    }
  }

  private applySettings(): void {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      this.registry.forEach((video, state) => {
        if (!state) return;

        // 应用面板设置
        if (state.panel) {
          if (!this.settings.showPanel) {
            state.panel.getElement().style.display = 'none';
          } else {
            state.panel.getElement().style.display = '';
          }

          if (this.settings.defaultSpeed !== video.playbackRate) {
            video.playbackRate = this.settings.defaultSpeed;
            state.panel.updateSpeedDisplay(this.settings.defaultSpeed);
          }
        }

        // 应用右键菜单设置
        if (!this.settings.showContextMenu && state.contextMenu) {
          state.contextMenu.hide();
          if (state.eventHandler) {
            document.removeEventListener('contextmenu', state.eventHandler, true);
            this.registry.update(video, { eventHandler: undefined });
          }
        } else if (this.settings.showContextMenu && state.contextMenu && !state.eventHandler) {
          const ctxContainer = state.container;
          const ctxMenu = state.contextMenu;
          const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target || target.closest('.vc-context-menu')) return;
            if (!ctxContainer.contains(target) && !isClickWithinVideo(e, video)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            ctxMenu.show(e.clientX, e.clientY);
          };
          document.addEventListener('contextmenu', handler, true);
          this.registry.update(video, { eventHandler: handler });
        }
      });
    } else {
      // 旧版设置应用逻辑
      this.panels.forEach((panel, video) => {
        if (!this.settings.showPanel) {
          panel.getElement().style.display = 'none';
        } else {
          panel.getElement().style.display = '';
        }

        if (this.settings.defaultSpeed !== video.playbackRate) {
          video.playbackRate = this.settings.defaultSpeed;
          panel.updateSpeedDisplay(this.settings.defaultSpeed);
        }
      });

      if (!this.settings.showContextMenu) {
        this.contextMenus.forEach((menu) => menu.hide());
        this.contextMenuHandlers.forEach((handler) => {
          document.removeEventListener('contextmenu', handler, true);
        });
        this.contextMenuHandlers.clear();
        this.contextMenuTargets.clear();
      } else {
        this.contextMenus.forEach((menu, video) => {
          if (!this.contextMenuHandlers.has(video)) {
            const eventTarget = findVideoContainer(video);
            const handler = (e: MouseEvent) => {
              const target = e.target as HTMLElement;
              if (!target || target.closest('.vc-context-menu')) return;
              if (!eventTarget.contains(target) && !isClickWithinVideo(e, video)) return;
              e.preventDefault();
              e.stopImmediatePropagation();
              menu.show(e.clientX, e.clientY);
            };
            document.addEventListener('contextmenu', handler, true);
            this.contextMenuHandlers.set(video, handler);
            this.contextMenuTargets.set(video, eventTarget);
          }
        });
      }
    }
  }

  getPanel(video: HTMLVideoElement): ControlPanel | undefined {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      return this.registry.get(video)?.panel;
    }
    return this.panels.get(video);
  }

  private togglePanel(video: HTMLVideoElement): void {
    const panel = this.getPanel(video);
    if (!panel) return;

    const element = panel.getElement();
    const isHidden = element.style.display === 'none';

    if (isHidden) {
      element.style.display = '';
      panel.show();
      if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
        this.registry.markPanelOpened(video);
      } else {
        const id = this.getVideoId(video);
        this.closedPanels.delete(id);
      }
    } else {
      element.style.display = 'none';
      this.markPanelClosed(video);
    }
  }

  private isPanelVisible(video: HTMLVideoElement): boolean {
    const panel = this.getPanel(video);
    if (!panel) return false;
    return panel.getElement().style.display !== 'none';
  }

  getAllPanels(): ControlPanel[] {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      const panels: ControlPanel[] = [];
      this.registry.forEach((_, state) => {
        if (state?.panel) {
          panels.push(state.panel);
        }
      });
      return panels;
    }
    return Array.from(this.panels.values());
  }

  getFirstVideo(): HTMLVideoElement | undefined {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      return this.registry.getFirstVideo();
    }
    return this.panels.keys().next().value;
  }

  toggleAllPanels(): void {
    if (FEATURE_FLAGS.USE_VIDEO_REGISTRY) {
      this.registry.forEach((_, state) => {
        if (state?.panel) {
          state.panel.getElement().classList.toggle('vc-visible');
        }
      });
    } else {
      this.panels.forEach((panel) => {
        panel.getElement().classList.toggle('vc-visible');
      });
    }
  }
}

// 单例实例
export const videoEnhancer = new VideoEnhancer();
