/**
 * 视频容器检测器
 * 使用加权评分系统替代简单的字符串匹配
 */

import type { ContainerScore, ContainerRule } from '@shared/types';
import { CONTAINER_MAX_DEPTH } from '@shared/constants';
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
  // SVG 元素的 className 是 SVGAnimatedString 类型
  if (className && typeof className === 'object' && 'baseVal' in className) {
    return (className as SVGAnimatedString).baseVal || '';
  }
  return '';
}

/**
 * 检测是否有不在容器内的元素覆盖视频
 * 这种情况需要选择更高层级的容器来正确捕获事件
 */
function hasOverlappingElements(container: HTMLElement, video: HTMLVideoElement): boolean {
  const videoRect = video.getBoundingClientRect();
  if (videoRect.width === 0 || videoRect.height === 0) return false;

  // 从容器的父元素开始向上检查，找出所有不在容器内但覆盖视频的元素
  let ancestor = container.parentElement;
  let depth = 0;

  while (ancestor && depth < CONTAINER_MAX_DEPTH) {
    // 检查祖先的所有子元素
    for (const child of ancestor.children) {
      // 跳过包含视频的元素链
      if (child === container || child.contains(container) || container.contains(child)) continue;

      // 检查这个元素及其子元素是否覆盖视频
      if (checkElementOverlapsVideo(child as HTMLElement, videoRect)) {
        return true;
      }
    }

    ancestor = ancestor.parentElement;
    depth++;
  }

  return false;
}

/**
 * 检查元素是否覆盖视频区域
 */
function checkElementOverlapsVideo(el: HTMLElement, videoRect: DOMRect): boolean {
  const style = window.getComputedStyle(el);

  // 跳过不可见元素
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  // 只检查绝对/固定定位且可交互的元素
  if (style.position !== 'absolute' && style.position !== 'fixed') return false;
  if (style.pointerEvents === 'none') return false;

  const elRect = el.getBoundingClientRect();
  if (elRect.width === 0 || elRect.height === 0) return false;

  // 检测是否与视频区域重叠
  const overlapsHorizontally =
    elRect.left < videoRect.right && elRect.right > videoRect.left;
  const overlapsVertically =
    elRect.top < videoRect.bottom && elRect.bottom > videoRect.top;

  if (overlapsHorizontally && overlapsVertically) {
    // 计算重叠面积
    const overlapWidth =
      Math.min(elRect.right, videoRect.right) - Math.max(elRect.left, videoRect.left);
    const overlapHeight =
      Math.min(elRect.bottom, videoRect.bottom) - Math.max(elRect.top, videoRect.top);
    const overlapArea = overlapWidth * overlapHeight;
    const videoArea = videoRect.width * videoRect.height;

    // 如果重叠面积超过视频面积的 10%，认为是覆盖物
    if (overlapArea / videoArea > 0.1) {
      return true;
    }
  }

  return false;
}

/**
 * 默认容器检测规则
 */
const DEFAULT_RULES: ContainerRule[] = [
  // data-* 属性标记（最高优先级）
  {
    name: 'data-player-attribute',
    weight: 100,
    test: (el) => {
      const attrs = [
        'data-plyr',
        'data-video-js',
        'data-jwplayer-id',
        'data-player',
        'data-setup',
      ];
      return attrs.some((attr) => el.hasAttribute(attr));
    },
  },

  // 明确的 "player" 类名（使用单词边界）
  {
    name: 'player-class-exact',
    weight: 80,
    test: (el) => {
      const className = getClassName(el).toLowerCase();
      const id = (el.id || '').toLowerCase();
      return /\bplayer\b/.test(className) || /\bplayer\b/.test(id);
    },
  },

  // ID 为 "player"
  {
    name: 'player-id',
    weight: 75,
    test: (el) => {
      return el.id?.toLowerCase() === 'player';
    },
  },

  // 明确的 "video" 类名（使用单词边界）
  {
    name: 'video-class-exact',
    weight: 60,
    test: (el) => {
      const className = getClassName(el).toLowerCase();
      const id = (el.id || '').toLowerCase();
      return /\bvideo\b/.test(className) || /\bvideo\b/.test(id);
    },
  },

  // 包含控制元素（按钮、滑块等）
  {
    name: 'has-control-elements',
    weight: 40,
    test: (el) => {
      const controls = el.querySelectorAll(
        'button, [role="button"], input[type="range"], [role="slider"]'
      );
      return controls.length >= 2;
    },
  },

  // 具有相对或绝对定位（常见于播放器容器）
  {
    name: 'positioned-container',
    weight: 30,
    test: (el) => {
      const style = window.getComputedStyle(el);
      return style.position === 'relative' || style.position === 'absolute';
    },
  },

  // 尺寸与视频相近
  {
    name: 'matching-dimensions',
    weight: 25,
    test: (el, video) => {
      const containerRect = el.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();
      // 容器尺寸与视频相差不超过 20%
      const widthDiff = Math.abs(containerRect.width - videoRect.width) / videoRect.width;
      const heightDiff = Math.abs(containerRect.height - videoRect.height) / videoRect.height;
      return widthDiff < 0.2 && heightDiff < 0.2;
    },
  },

  // 存在覆盖视频的外部元素（如弹幕层）- 强力负分惩罚
  // 这个惩罚必须足够大，确保不包含覆盖物的容器优先
  {
    name: 'has-external-overlays',
    weight: -150, // 强力惩罚：如果容器外有覆盖物，必须选择更高层级容器
    test: (el, video) => {
      return hasOverlappingElements(el, video);
    },
  },
];

export class ContainerDetector {
  private rules: ContainerRule[];
  private cache = new WeakMap<HTMLVideoElement, ContainerScore>();

  constructor(rules: ContainerRule[] = DEFAULT_RULES) {
    // 按权重降序排列
    this.rules = [...rules].sort((a, b) => b.weight - a.weight);
  }

  /**
   * 检测视频的最佳容器
   */
  detect(video: HTMLVideoElement): ContainerScore {
    // 检查缓存
    const cached = this.cache.get(video);
    if (cached && document.contains(cached.element)) {
      return cached;
    }

    const candidates: ContainerScore[] = [];
    let current: HTMLElement | null = video.parentElement;
    let depth = 0;

    while (current && depth < CONTAINER_MAX_DEPTH) {
      const score = this.scoreElement(current, video);
      if (score.verified) {
        candidates.push(score);
      }
      current = current.parentElement;
      depth++;
    }

    // 按分数降序排列，选择最高分
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0] || {
      element: video.parentElement || document.body,
      score: 0,
      reasons: ['fallback'],
      verified: true,
    };

    // 缓存结果
    this.cache.set(video, best);
    return best;
  }

  /**
   * 对元素评分
   */
  private scoreElement(
    element: HTMLElement,
    video: HTMLVideoElement
  ): ContainerScore {
    const result: ContainerScore = {
      element,
      score: 0,
      reasons: [],
      verified: element.contains(video), // 关键：验证容器确实包含视频
    };

    if (!result.verified) {
      return result;
    }

    for (const rule of this.rules) {
      const matched = withErrorBoundary(
        () => rule.test(element, video),
        false,
        `ContainerRule: ${rule.name}`
      );
      if (matched) {
        result.score += rule.weight;
        result.reasons.push(rule.name);
      }
    }

    return result;
  }

  /**
   * 使缓存失效
   */
  invalidate(video: HTMLVideoElement): void {
    this.cache.delete(video);
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: ContainerRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.weight - a.weight);
  }

  /**
   * 移除规则
   */
  removeRule(name: string): void {
    this.rules = this.rules.filter((r) => r.name !== name);
  }

  /**
   * 获取所有规则名
   */
  getRuleNames(): string[] {
    return this.rules.map((r) => r.name);
  }
}

// 默认单例
export const containerDetector = new ContainerDetector();
