/**
 * i18n 辅助工具 - 支持运行时语言切换
 *
 * currentLang = undefined: 跟随浏览器（chrome.i18n.getMessage）
 * currentLang = 'zh_CN' | 'en': 使用内置字典
 */

import zhCN from '../../_locales/zh_CN/messages.json';
import en from '../../_locales/en/messages.json';

type MessageEntry = {
  message: string;
  placeholders?: Record<string, { content: string }>;
};
type MessagesMap = Record<string, MessageEntry>;

const dictionaries: Record<string, MessagesMap> = {
  zh_CN: zhCN as unknown as MessagesMap,
  en: en as unknown as MessagesMap,
};

let currentLang: string | undefined;

/** 设置当前语言（undefined = 跟随浏览器） */
export function setLanguage(lang: string | undefined): void {
  currentLang = lang;
}

/** 获取当前语言设置 */
export function getLanguage(): string | undefined {
  return currentLang;
}

/** 从 chrome.storage.local 读取语言偏好 */
export async function initLanguage(): Promise<void> {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    if (settings?.language) {
      currentLang = settings.language;
    }
  } catch {
    // content script 在 MAIN world 等场景下可能无法访问 storage
  }
}

/** 获取翻译文本，支持占位符替换 */
export function t(key: string, ...substitutions: string[]): string {
  // 用户指定了语言 → 使用内置字典
  if (currentLang && dictionaries[currentLang]) {
    const entry = dictionaries[currentLang]?.[key];
    if (entry) {
      return resolvePlaceholders(entry, substitutions);
    }
    return key;
  }

  // 默认：跟随浏览器
  try {
    const message = chrome.i18n.getMessage(key, substitutions);
    return message || key;
  } catch {
    return key;
  }
}

/** 解析 Chrome i18n 格式的占位符 */
function resolvePlaceholders(entry: MessageEntry, substitutions: string[]): string {
  let msg = entry.message;
  if (!entry.placeholders || substitutions.length === 0) return msg;

  for (const [name, def] of Object.entries(entry.placeholders)) {
    const match = def.content.match(/^\$(\d+)$/);
    if (match?.[1]) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < substitutions.length) {
        msg = msg.replace(new RegExp(`\\$${name}\\$`, 'gi'), substitutions[idx] || '');
      }
    }
  }
  return msg;
}
