/**
 * 快捷键命令处理器
 */

import type { CommandName } from '@shared/types';

type CommandHandler = (tab: chrome.tabs.Tab) => Promise<void>;

const commandHandlers: Record<CommandName, CommandHandler> = {
  'toggle-pip': async (tab) => {
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'togglePiP' });
    }
  },

  'toggle-fullscreen': async (tab) => {
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleFullscreen' });
    }
  },

  'speed-up': async (tab) => {
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'speedUp' });
    }
  },

  'speed-down': async (tab) => {
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'speedDown' });
    }
  },
};

export function setupCommandHandler(): void {
  chrome.commands.onCommand.addListener(async (command, tab) => {
    if (!tab) return;

    const handler = commandHandlers[command as CommandName];
    if (handler) {
      try {
        await handler(tab);
      } catch (error) {
        console.error(`Video Companion: 命令 ${command} 执行失败`, error);
      }
    }
  });
}
