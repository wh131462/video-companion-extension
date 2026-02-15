/**
 * 检测视频是否有自定义控制器
 * 采用多级检测策略：
 * 1. 已知选择器匹配（快速路径）
 * 2. ARIA 无障碍属性检测
 * 3. 交互元素区域检测
 * 4. 覆盖层结构检测
 * 5. 播放器库指纹检测
 * 6. CSS 类名模式匹配
 */

import type { DetectionResult, ContainerScore } from '@shared/types';
import { FEATURE_FLAGS } from '@shared/constants';
import { ContainerDetector, containerDetector } from './ContainerDetector';
import { DetectionCache, detectionCache } from './DetectionCache';
import { PlayerPluginRegistry, playerPluginRegistry } from './PlayerPluginRegistry';

// 导出新组件供外部使用
export { ContainerDetector, DetectionCache, PlayerPluginRegistry };
export { containerDetector, detectionCache, playerPluginRegistry };
export type { ContainerScore };

// 已知网站的自定义控制器选择器（在整个文档中查找）
const KNOWN_SITE_SELECTORS = [
  // YouTube
  '.ytp-chrome-bottom',
  '.ytp-chrome-controls',

  // Bilibili (新旧版播放器)
  '.bilibili-player-video-control',
  '.bpx-player-control-wrap',
  '.bpx-player-control-bottom',
  '.squirtle-controller',
  '.bpx-player-container',

  // 腾讯视频
  '.txp_btn_control_wrap',
  '.txp_player_control',

  // 爱奇艺
  '.iqp-player-control',
  '.iqp-bottom',

  // 优酷
  '.youku-control-bar',
  '.control-panel-inner',

  // 西瓜视频/抖音
  '.xgplayer-controls',
  '.xg-controls',

  // 保利威 (Polyv)
  '.pv-video-player',
  '.pv-controls',

  // 网易云课堂 (study.163.com)
  '.u-edu-h5player-controlwrap',
];

// 通用选择器（在容器内查找）
const GENERIC_CONTROL_SELECTORS = [
  '[class*="player-control"]',
  '[class*="video-control"]',
  '[class*="-controls"]',
  '[class*="_controls"]',
];

// 播放器库标记
const PLAYER_LIBRARY_MARKERS = [
  'data-plyr',           // Plyr
  'data-video-js',       // Video.js
  'data-jwplayer-id',    // JW Player
  'data-player',         // 通用
  'data-setup',          // Video.js
];

// 播放器库类名前缀
const PLAYER_LIBRARY_CLASS_PREFIXES = [
  'vjs-',        // Video.js
  'plyr',        // Plyr
  'jw-',         // JW Player
  'flowplayer',  // Flowplayer
  'mejs',        // MediaElement.js
  'video-react', // video-react
  'shaka',       // Shaka Player
  'ckin',        // Clappr
  'pv-',         // Polyv (保利威)
  'u-edu-h5player', // 网易云课堂
];

// CSS 类名模式匹配
const CONTROL_CLASS_PATTERNS = [
  /player[-_]?controls?/i,
  /video[-_]?controls?/i,
  /media[-_]?controls?/i,
  /control[-_]?bar/i,
  /controls?[-_]?wrapper/i,
  /controls?[-_]?container/i,
  /bottom[-_]?controls?/i,
  /playback[-_]?controls?/i,
];

// 控制相关的关键词 (用于 ARIA 检测)
const CONTROL_KEYWORDS = [
  'play', 'pause', 'stop', 'mute', 'unmute', 'volume',
  'fullscreen', 'seek', 'forward', 'backward', 'progress',
  'rewind', 'skip', 'next', 'previous', 'captions', 'subtitles',
  'settings', 'quality', 'speed', 'playback', 'audio',
  '播放', '暂停', '音量', '全屏', '静音', '快进', '快退', '倍速',
];

/**
 * 检测视频元素是否有自定义控制器
 */
export function hasCustomControls(video: HTMLVideoElement): boolean {
  try {
    // 使用新的缓存系统
    if (FEATURE_FLAGS.USE_DETECTION_CACHE) {
      const cached = detectionCache.get(video);
      if (cached) {
        return cached.hasCustomControls;
      }
    }

    // 使用新的容器检测器
    const containerScore = FEATURE_FLAGS.USE_WEIGHTED_CONTAINER
      ? containerDetector.detect(video)
      : { element: findVideoContainerLegacy(video), score: 0, reasons: [], verified: true };

    const container = containerScore.element;

    // 检查插件系统是否能识别播放器
    const playerType = playerPluginRegistry.detect(video, container);
    if (playerType) {
      const result: DetectionResult = {
        hasCustomControls: true,
        confidence: 'high',
        detectedBy: `plugin:${playerType}`,
      };
      if (FEATURE_FLAGS.USE_DETECTION_CACHE) {
        detectionCache.set(video, result, container);
      }
      return true;
    }

    // 1. 首先尝试快速匹配已知选择器
    if (matchKnownSelectors(container)) {
      const result: DetectionResult = {
        hasCustomControls: true,
        confidence: 'high',
        detectedBy: 'known-selector',
      };
      if (FEATURE_FLAGS.USE_DETECTION_CACHE) {
        detectionCache.set(video, result, container);
      }
      return true;
    }

    // 2. 智能检测
    const result = detectSmartControls(video, container);
    if (FEATURE_FLAGS.USE_DETECTION_CACHE) {
      detectionCache.set(video, result, container);
    }
    return result.hasCustomControls;
  } catch {
    // 检测失败时返回 false，让扩展显示控制面板
    return false;
  }
}

/**
 * 匹配已知的选择器
 */
function matchKnownSelectors(container: HTMLElement): boolean {
  // 1. 在整个文档中查找已知网站的选择器
  for (const selector of KNOWN_SITE_SELECTORS) {
    try {
      const controls = document.querySelector(selector);
      if (controls && isElementVisible(controls as HTMLElement)) {
        return true;
      }
    } catch {
      // 选择器可能无效，跳过
    }
  }

  // 2. 在容器内查找通用选择器
  for (const selector of GENERIC_CONTROL_SELECTORS) {
    try {
      const controls = container.querySelector(selector);
      if (controls && isElementVisible(controls as HTMLElement)) {
        return true;
      }
    } catch {
      // 选择器可能无效，跳过
    }
  }

  return false;
}

/**
 * 智能检测控制器
 */
function detectSmartControls(video: HTMLVideoElement, container: HTMLElement): DetectionResult {
  // 检测优先级从高到低

  // 1. 检测播放器库指纹 (高置信度)
  if (hasPlayerLibraryMarkers(video, container)) {
    return { hasCustomControls: true, confidence: 'high', detectedBy: 'player-library' };
  }

  // 2. 检测 CSS 类名模式 (高置信度)
  if (hasControlClassPattern(container)) {
    return { hasCustomControls: true, confidence: 'high', detectedBy: 'class-pattern' };
  }

  // 3. 检测视频 controls 属性被禁用且有控制元素 (高置信度)
  if (video.controls === false && hasControlElements(container)) {
    return { hasCustomControls: true, confidence: 'high', detectedBy: 'controls-disabled' };
  }

  // 4. 检测 ARIA 属性 (高置信度)
  if (hasAriaControls(container)) {
    return { hasCustomControls: true, confidence: 'high', detectedBy: 'aria-attributes' };
  }

  // 5. 检测交互元素密度 (中等置信度)
  if (hasInteractiveControlArea(video, container)) {
    return { hasCustomControls: true, confidence: 'medium', detectedBy: 'interactive-elements' };
  }

  // 6. 检测覆盖层 (中等置信度)
  if (hasControlOverlay(video, container)) {
    return { hasCustomControls: true, confidence: 'medium', detectedBy: 'overlay-detection' };
  }

  return { hasCustomControls: false, confidence: 'low', detectedBy: 'none' };
}

/**
 * 安全获取元素的类名字符串
 */
function getClassName(el: Element | null): string {
  if (!el) return '';
  const className = el.className;
  // SVG 元素的 className 是 SVGAnimatedString 类型
  if (typeof className === 'string') {
    return className;
  }
  if (className && typeof className === 'object' && 'baseVal' in className) {
    return (className as SVGAnimatedString).baseVal || '';
  }
  return '';
}

/**
 * 检测播放器库标记
 */
function hasPlayerLibraryMarkers(video: HTMLVideoElement, container: HTMLElement): boolean {
  try {
    // 检查 data-* 属性
    for (const marker of PLAYER_LIBRARY_MARKERS) {
      if (video.hasAttribute(marker) || container.hasAttribute(marker)) {
        return true;
      }
    }

    // 检查类名前缀
    const containerClass = getClassName(container);
    const videoClass = getClassName(video);
    const combinedClass = `${containerClass} ${videoClass}`;

    for (const prefix of PLAYER_LIBRARY_CLASS_PREFIXES) {
      if (combinedClass.includes(prefix)) {
        return true;
      }
    }

    // 检查父元素的类名
    let parent = container.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      const parentClass = getClassName(parent);
      for (const prefix of PLAYER_LIBRARY_CLASS_PREFIXES) {
        if (parentClass.includes(prefix)) {
          return true;
        }
      }
      parent = parent.parentElement;
      depth++;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 检测 CSS 类名模式
 */
function hasControlClassPattern(container: HTMLElement): boolean {
  try {
    // 优化：使用精确选择器代替 querySelectorAll('*')
    const controlElements = container.querySelectorAll([
      '[class*="control"]',
      '[class*="player"]',
      '[class*="bottom"]',
      '[class*="wrapper"]',
      '[class*="bar"]',
    ].join(', '));

    for (const el of controlElements) {
      const className = getClassName(el);
      if (!className) continue;

      for (const pattern of CONTROL_CLASS_PATTERNS) {
        if (pattern.test(className)) {
          // 验证元素可见
          if (isElementVisible(el as HTMLElement)) {
            return true;
          }
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 检测 ARIA 无障碍属性
 */
function hasAriaControls(container: HTMLElement): boolean {
  try {
    // 查找带有控制相关属性的元素
    const ariaElements = container.querySelectorAll(
      '[aria-label], [role="button"], [role="slider"], [role="progressbar"], [title]'
    );

    let controlCount = 0;

    for (const el of ariaElements) {
      const label = (
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        ''
      ).toLowerCase();
      const role = el.getAttribute('role');

      // 检查是否包含控制相关关键词
      if (CONTROL_KEYWORDS.some(kw => label.includes(kw))) {
        controlCount++;
      }

      // 进度条/音量条通常是 slider 或 progressbar
      if (role === 'slider' || role === 'progressbar') {
        controlCount++;
      }
    }

    // 至少检测到 2 个控制元素
    return controlCount >= 2;
  } catch {
    return false;
  }
}

/**
 * 检测是否有基本的控制元素
 */
function hasControlElements(container: HTMLElement): boolean {
  try {
    const buttons = container.querySelectorAll('button, [role="button"]');
    const sliders = container.querySelectorAll('input[type="range"], [role="slider"], [role="progressbar"]');
    const svgIcons = container.querySelectorAll('svg');

    // 过滤可见元素
    const visibleButtons = Array.from(buttons).filter(el => isElementVisible(el as HTMLElement));
    const visibleSliders = Array.from(sliders).filter(el => isElementVisible(el as HTMLElement));
    const visibleSvgs = Array.from(svgIcons).filter(el => isSvgVisible(el));

    // 启发式：有按钮 + (滑块 或 多个图标) = 可能是自定义控制器
    return visibleButtons.length >= 1 && (visibleSliders.length >= 1 || visibleSvgs.length >= 2);
  } catch {
    return false;
  }
}

/**
 * 检测交互元素区域
 */
function hasInteractiveControlArea(video: HTMLVideoElement, container: HTMLElement): boolean {
  try {
    const videoRect = video.getBoundingClientRect();

    // 视频太小则跳过
    if (videoRect.width < 100 || videoRect.height < 100) {
      return false;
    }

    // 检测视频下方区域的交互元素 (典型控制栏位置)
    const controlAreaBottom = videoRect.bottom;
    const controlAreaTop = videoRect.bottom - 80; // 控制栏高度约 40-80px

    const interactiveElements = container.querySelectorAll(
      'button, [role="button"], input[type="range"], progress, [role="slider"], [role="progressbar"]'
    );

    let elementsInControlArea = 0;

    for (const el of interactiveElements) {
      if (!isElementVisible(el as HTMLElement)) continue;

      const rect = (el as HTMLElement).getBoundingClientRect();

      // 检查元素是否在控制栏区域
      const inVerticalRange = rect.top >= controlAreaTop - 10 && rect.bottom <= controlAreaBottom + 30;
      const inHorizontalRange = rect.left >= videoRect.left - 20 && rect.right <= videoRect.right + 20;

      if (inVerticalRange && inHorizontalRange) {
        elementsInControlArea++;
      }
    }

    // 至少 3 个控制元素
    return elementsInControlArea >= 3;
  } catch {
    return false;
  }
}

/**
 * 检测控制覆盖层
 */
function hasControlOverlay(video: HTMLVideoElement, container: HTMLElement): boolean {
  try {
    const videoRect = video.getBoundingClientRect();

    // 视频太小则跳过
    if (videoRect.width < 100 || videoRect.height < 100) {
      return false;
    }

    // 优化：只查询可能是覆盖层的元素（有定位相关类名或包含控制元素）
    const potentialOverlays = container.querySelectorAll([
      '[class*="overlay"]',
      '[class*="control"]',
      '[class*="bottom"]',
      '[class*="bar"]',
      'div > button',
      'div > [role="button"]',
    ].join(', '));

    for (const child of potentialOverlays) {
      const el = child as HTMLElement;
      const style = window.getComputedStyle(el);

      // 只检查绝对或固定定位的元素
      if (style.position !== 'absolute' && style.position !== 'fixed') {
        continue;
      }

      const rect = el.getBoundingClientRect();

      // 检查是否覆盖视频底部 (控制栏位置)
      const overlapsBottom = rect.bottom >= videoRect.bottom - 100 && rect.top <= videoRect.bottom;
      const overlapsHorizontally = rect.left <= videoRect.left + 50 && rect.right >= videoRect.right - 50;
      const hasReasonableHeight = rect.height >= 30 && rect.height <= 150;

      if (overlapsBottom && overlapsHorizontally && hasReasonableHeight) {
        // 检查是否包含交互元素
        const hasInteractive = el.querySelector('button, [role="button"], svg, input, progress');
        if (hasInteractive) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 检查元素是否可见
 */
function isElementVisible(el: HTMLElement): boolean {
  try {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    );
  } catch {
    return false;
  }
}

/**
 * 检查 SVG 元素是否可见
 */
function isSvgVisible(el: SVGSVGElement): boolean {
  try {
    const style = window.getComputedStyle(el);
    const bbox = el.getBBox();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      bbox.width > 0 &&
      bbox.height > 0
    );
  } catch {
    return false;
  }
}

/**
 * 查找视频容器（使用新系统）
 */
export function findVideoContainer(video: HTMLVideoElement): HTMLElement {
  if (FEATURE_FLAGS.USE_WEIGHTED_CONTAINER) {
    return containerDetector.detect(video).element;
  }
  return findVideoContainerLegacy(video);
}

/**
 * 查找视频容器（旧版实现，保留作为兼容）
 */
function findVideoContainerLegacy(video: HTMLVideoElement): HTMLElement {
  try {
    // 向上查找最多 5 层父元素，优先选择 "player" 容器
    let current: HTMLElement | null = video.parentElement;
    let depth = 0;
    let videoMatch: HTMLElement | null = null;

    while (current && depth < 5) {
      // 检查是否是播放器容器
      const className = getClassName(current).toLowerCase();
      const id = (current.id || '').toLowerCase();

      const isPlayerMatch = className.includes('player') || id.includes('player');
      const isVideoMatch = className.includes('video') || id.includes('video');

      if (isPlayerMatch) {
        // "player" 是最优匹配，直接返回
        return current;
      }

      if (isVideoMatch && !videoMatch) {
        // 记录第一个 "video" 匹配，但继续向上查找可能的 "player" 容器
        videoMatch = current;
      }

      current = current.parentElement;
      depth++;
    }

    // 如果找到了 "video" 匹配但没找到 "player" 匹配，使用 "video" 匹配
    if (videoMatch) {
      return videoMatch;
    }

    // 返回最近的 5 层祖先或 body
    return video.parentElement?.parentElement?.parentElement?.parentElement?.parentElement ||
           video.parentElement ||
           document.body;
  } catch {
    return video.parentElement || document.body;
  }
}

/**
 * 获取详细的检测结果（用于调试）
 */
export function getDetectionDetails(video: HTMLVideoElement): DetectionResult {
  const container = findVideoContainer(video);

  // 先检查已知选择器
  if (matchKnownSelectors(container)) {
    return { hasCustomControls: true, confidence: 'high', detectedBy: 'known-selector' };
  }

  // 智能检测
  return detectSmartControls(video, container);
}
