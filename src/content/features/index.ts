/**
 * 功能模块统一导出
 */

export { pictureInPicture, PictureInPictureFeature } from './PictureInPicture';
export { fullscreen, webFullscreen, FullscreenFeature, WebFullscreenFeature } from './Fullscreen';
export { playbackSpeed, PlaybackSpeedFeature } from './PlaybackSpeed';
export { screenshot, ScreenshotFeature } from './Screenshot';
export { download, DownloadFeature } from './Download';
export { loop, LoopFeature } from './Loop';
export { mute, MuteFeature } from './Mute';
export { hideControls, HideControlsFeature } from './HideControls';

// 功能实例集合
import { pictureInPicture } from './PictureInPicture';
import { fullscreen, webFullscreen } from './Fullscreen';
import { playbackSpeed } from './PlaybackSpeed';
import { screenshot } from './Screenshot';
import { download } from './Download';
import { loop } from './Loop';
import { mute } from './Mute';
import { hideControls } from './HideControls';

export const features = {
  pictureInPicture,
  fullscreen,
  webFullscreen,
  playbackSpeed,
  screenshot,
  download,
  loop,
  mute,
  hideControls,
} as const;
