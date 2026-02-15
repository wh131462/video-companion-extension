/**
 * 播放器插件注册表
 * 可扩展的播放器检测系统
 */

import type { PlayerPlugin } from '@shared/types';
import { withErrorBoundary } from '../core/ErrorBoundary';

/**
 * 安全获取元素的类名字符串
 */
function getClassName(el: Element | null): string {
  if (!el) return '';
  const className = el.className;
  if (typeof className === 'string') {
    return className;
  }
  if (className && typeof className === 'object' && 'baseVal' in className) {
    return (className as SVGAnimatedString).baseVal || '';
  }
  return '';
}

/**
 * 内置播放器插件
 */
const BUILTIN_PLUGINS: PlayerPlugin[] = [
  // YouTube
  {
    name: 'youtube',
    priority: 100,
    detect: () => {
      return !!document.querySelector('.ytp-chrome-bottom, .ytp-chrome-controls');
    },
    getContainer: (video) => {
      return video.closest('.html5-video-player') as HTMLElement | null;
    },
  },

  // Bilibili (新旧版)
  {
    name: 'bilibili',
    priority: 100,
    detect: () => {
      return !!document.querySelector(
        '.bilibili-player-video-control, .bpx-player-control-wrap, .bpx-player-control-bottom, .squirtle-controller'
      );
    },
    getContainer: (video) => {
      return video.closest('.bpx-player-container, .bilibili-player-video') as HTMLElement | null;
    },
  },

  // 保利威 (Polyv)
  {
    name: 'polyv',
    priority: 100,
    detect: (_video, container) => {
      return !!document.querySelector('.pv-video-player, .pv-controls') ||
             getClassName(container).includes('pv-');
    },
    getContainer: (video) => {
      return video.closest('.pv-video-player') as HTMLElement | null;
    },
  },

  // 腾讯视频
  {
    name: 'tencent',
    priority: 100,
    detect: () => {
      return !!document.querySelector('.txp_btn_control_wrap, .txp_player_control');
    },
  },

  // 爱奇艺
  {
    name: 'iqiyi',
    priority: 100,
    detect: () => {
      return !!document.querySelector('.iqp-player-control, .iqp-bottom');
    },
  },

  // 优酷
  {
    name: 'youku',
    priority: 100,
    detect: () => {
      return !!document.querySelector('.youku-control-bar, .control-panel-inner');
    },
  },

  // 西瓜视频/抖音
  {
    name: 'xigua',
    priority: 100,
    detect: () => {
      return !!document.querySelector('.xgplayer-controls, .xg-controls');
    },
  },

  // 网易云课堂 (study.163.com)
  {
    name: 'netease-edu',
    priority: 100,
    detect: (_video, container) => {
      return !!document.querySelector('.u-edu-h5player-controlwrap') ||
             getClassName(container).includes('u-edu-h5player');
    },
    getContainer: (video) => {
      return video.closest('.u-edu-h5player') as HTMLElement | null;
    },
  },

  // Video.js
  {
    name: 'videojs',
    priority: 90,
    detect: (video, container) => {
      return (
        video.classList.contains('vjs-tech') ||
        video.hasAttribute('data-video-js') ||
        video.hasAttribute('data-setup') ||
        getClassName(container).includes('video-js') ||
        getClassName(container).includes('vjs-')
      );
    },
    getContainer: (video) => {
      return video.closest('.video-js') as HTMLElement | null;
    },
  },

  // Plyr
  {
    name: 'plyr',
    priority: 90,
    detect: (video, container) => {
      return (
        video.hasAttribute('data-plyr') ||
        !!video.closest('.plyr') ||
        getClassName(container).includes('plyr')
      );
    },
    getContainer: (video) => {
      return video.closest('.plyr') as HTMLElement | null;
    },
  },

  // JW Player
  {
    name: 'jwplayer',
    priority: 90,
    detect: (video, container) => {
      return (
        video.hasAttribute('data-jwplayer-id') ||
        getClassName(container).includes('jw-')
      );
    },
  },

  // MediaElement.js
  {
    name: 'mediaelement',
    priority: 90,
    detect: (_video, container) => {
      return getClassName(container).includes('mejs');
    },
  },

  // Flowplayer
  {
    name: 'flowplayer',
    priority: 90,
    detect: (_video, container) => {
      return getClassName(container).includes('flowplayer');
    },
  },

  // Shaka Player
  {
    name: 'shaka',
    priority: 90,
    detect: (_video, container) => {
      return getClassName(container).includes('shaka');
    },
  },

  // Clappr
  {
    name: 'clappr',
    priority: 90,
    detect: (_video, container) => {
      return getClassName(container).includes('ckin');
    },
  },
];

export class PlayerPluginRegistry {
  private plugins: PlayerPlugin[] = [];

  constructor(includeBuiltins = true) {
    if (includeBuiltins) {
      this.plugins = [...BUILTIN_PLUGINS];
    }
    this.sortPlugins();
  }

  /**
   * 注册新插件
   */
  register(plugin: PlayerPlugin): void {
    // 检查是否已存在同名插件
    const existingIndex = this.plugins.findIndex((p) => p.name === plugin.name);
    if (existingIndex >= 0) {
      this.plugins[existingIndex] = plugin;
    } else {
      this.plugins.push(plugin);
    }
    this.sortPlugins();
  }

  /**
   * 注销插件
   */
  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  /**
   * 检测视频使用的播放器
   * @returns 检测到的播放器名称，未检测到返回 null
   */
  detect(video: HTMLVideoElement, container: HTMLElement): string | null {
    for (const plugin of this.plugins) {
      const detected = withErrorBoundary(
        () => plugin.detect(video, container),
        false,
        `PlayerPlugin: ${plugin.name}`
      );
      if (detected) {
        return plugin.name;
      }
    }
    return null;
  }

  /**
   * 获取播放器专用容器
   */
  getContainer(video: HTMLVideoElement, pluginName: string): HTMLElement | null {
    const plugin = this.plugins.find((p) => p.name === pluginName);
    if (plugin?.getContainer) {
      return withErrorBoundary(
        () => plugin.getContainer!(video),
        null,
        `getContainer: ${pluginName}`
      );
    }
    return null;
  }

  /**
   * 获取所有插件名称
   */
  getPluginNames(): string[] {
    return this.plugins.map((p) => p.name);
  }

  /**
   * 检查是否有指定插件
   */
  hasPlugin(name: string): boolean {
    return this.plugins.some((p) => p.name === name);
  }

  /**
   * 按优先级排序
   */
  private sortPlugins(): void {
    this.plugins.sort((a, b) => b.priority - a.priority);
  }
}

// 默认单例
export const playerPluginRegistry = new PlayerPluginRegistry();
