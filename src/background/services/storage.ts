/**
 * 存储服务
 */

import type { UserSettings, Stats, StorageData } from '@shared/types';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '@shared/constants';

class StorageService {
  async getSettings(): Promise<UserSettings> {
    const data = await chrome.storage.local.get('settings');
    return data.settings || DEFAULT_SETTINGS;
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.local.set({ settings });
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await this.saveSettings(updated);
    return updated;
  }

  async getStats(): Promise<Stats> {
    const data = await chrome.storage.local.get('stats');
    return data.stats || DEFAULT_STATS;
  }

  async updateStats(updates: Partial<Stats>): Promise<Stats> {
    const current = await this.getStats();
    const updated = { ...current, ...updates };
    await chrome.storage.local.set({ stats: updated });
    return updated;
  }

  async initializeDefaults(): Promise<void> {
    const data = await chrome.storage.local.get(['settings', 'stats']);

    if (!data.settings) {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }

    if (!data.stats) {
      await chrome.storage.local.set({
        stats: { ...DEFAULT_STATS, installDate: Date.now() },
      });
    }
  }

  async migrateSettings(): Promise<void> {
    const settings = await this.getSettings();
    const updated = { ...DEFAULT_SETTINGS, ...settings };
    await this.saveSettings(updated);
  }

  async getAll(): Promise<StorageData> {
    const [settings, stats] = await Promise.all([
      this.getSettings(),
      this.getStats(),
    ]);
    return { settings, stats };
  }

  onChanged(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
  ): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }
}

export const storageService = new StorageService();
