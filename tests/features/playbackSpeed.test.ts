/**
 * 播放速度功能测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlaybackSpeedFeature } from '../../src/content/features/PlaybackSpeed';

describe('PlaybackSpeedFeature', () => {
  let feature: PlaybackSpeedFeature;
  let video: HTMLVideoElement;

  beforeEach(() => {
    feature = new PlaybackSpeedFeature();
    video = document.createElement('video');
    video.playbackRate = 1;
  });

  describe('setSpeed', () => {
    it('should set playback speed', () => {
      feature.setSpeed(video, 2);
      expect(video.playbackRate).toBe(2);
    });

    it('should clamp speed to max value', () => {
      feature.setSpeed(video, 5);
      expect(video.playbackRate).toBe(3);
    });

    it('should clamp speed to min value', () => {
      feature.setSpeed(video, 0.1);
      expect(video.playbackRate).toBe(0.25);
    });
  });

  describe('getSpeed', () => {
    it('should return current playback speed', () => {
      video.playbackRate = 1.5;
      expect(feature.getSpeed(video)).toBe(1.5);
    });
  });

  describe('increaseSpeed', () => {
    it('should increase speed by default step', () => {
      video.playbackRate = 1;
      const newSpeed = feature.increaseSpeed(video);
      expect(newSpeed).toBe(1.25);
    });

    it('should increase speed by custom step', () => {
      video.playbackRate = 1;
      const newSpeed = feature.increaseSpeed(video, 0.5);
      expect(newSpeed).toBe(1.5);
    });
  });

  describe('decreaseSpeed', () => {
    it('should decrease speed by default step', () => {
      video.playbackRate = 1;
      const newSpeed = feature.decreaseSpeed(video);
      expect(newSpeed).toBe(0.75);
    });

    it('should not go below minimum', () => {
      video.playbackRate = 0.25;
      const newSpeed = feature.decreaseSpeed(video);
      expect(newSpeed).toBe(0.25);
    });
  });

  describe('formatSpeed', () => {
    it('should format speed correctly', () => {
      expect(feature.formatSpeed(1)).toBe('1x');
      expect(feature.formatSpeed(1.5)).toBe('1.5x');
      expect(feature.formatSpeed(2)).toBe('2x');
    });
  });
});
