/**
 * 检测视频是否有自定义控制器
 */

// 常见视频网站的自定义控制器选择器
const CUSTOM_CONTROLS_SELECTORS = [
  // YouTube
  '.ytp-chrome-bottom',
  '.ytp-chrome-controls',

  // Bilibili
  '.bilibili-player-video-control',
  '.bpx-player-control-wrap',
  '.squirtle-controller',

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

  // 通用选择器
  '[class*="player-control"]',
  '[class*="video-control"]',
  '[class*="-controls"]',
  '[class*="_controls"]',
];

/**
 * 检测视频元素是否有自定义控制器
 */
export function hasCustomControls(video: HTMLVideoElement): boolean {
  // 向上查找父元素中是否有自定义控制器
  const container = findVideoContainer(video);

  for (const selector of CUSTOM_CONTROLS_SELECTORS) {
    try {
      const controls = container.querySelector(selector);
      if (controls) {
        // 确保控制器是可见的（非隐藏）
        const style = window.getComputedStyle(controls);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return true;
        }
      }
    } catch {
      // 选择器可能无效，跳过
    }
  }

  return false;
}

/**
 * 查找视频容器
 */
function findVideoContainer(video: HTMLVideoElement): HTMLElement {
  // 向上查找最多 5 层父元素
  let current: HTMLElement | null = video.parentElement;
  let depth = 0;

  while (current && depth < 5) {
    // 检查是否是播放器容器
    const className = current.className?.toLowerCase() || '';
    const id = current.id?.toLowerCase() || '';

    if (
      className.includes('player') ||
      className.includes('video') ||
      id.includes('player') ||
      id.includes('video')
    ) {
      return current;
    }

    current = current.parentElement;
    depth++;
  }

  // 返回最近的 5 层祖先或 body
  return video.parentElement?.parentElement?.parentElement?.parentElement?.parentElement ||
         video.parentElement ||
         document.body;
}
