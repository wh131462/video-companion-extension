/**
 * Video Companion Website - i18n Engine
 * 轻量级国际化引擎：语言检测、文本替换、语言切换
 */
(function () {
  'use strict';

  var SUPPORTED_LANGS = ['zh-CN', 'en'];
  var DEFAULT_LANG = 'zh-CN';
  var STORAGE_KEY = 'vc-website-lang';

  /** 翻译字典映射 */
  var dictionaries = {
    'zh-CN': function () { return window.I18N_ZHCN || {}; },
    'en': function () { return window.I18N_EN || {}; },
  };

  /** 检测语言：URL 参数 > localStorage > 浏览器语言 > 默认 */
  function detectLanguage() {
    // 1. URL 参数 ?lang=en
    var params = new URLSearchParams(window.location.search);
    var paramLang = params.get('lang');
    if (paramLang && SUPPORTED_LANGS.indexOf(paramLang) !== -1) {
      return paramLang;
    }

    // 2. localStorage
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.indexOf(stored) !== -1) {
      return stored;
    }

    // 3. 浏览器语言
    var browserLang = navigator.language || navigator.userLanguage || '';
    if (browserLang.indexOf('zh') === 0) {
      return 'zh-CN';
    }
    if (browserLang.indexOf('en') === 0) {
      return 'en';
    }

    return DEFAULT_LANG;
  }

  /** 获取翻译文本 */
  function getText(key, lang) {
    var dict = dictionaries[lang] ? dictionaries[lang]() : {};
    return dict[key] || key;
  }

  /** 应用翻译到页面 */
  function applyTranslations(lang) {
    // data-i18n: 替换 textContent
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = getText(key, lang);
    });

    // data-i18n-html: 替换 innerHTML（用于包含 HTML 实体的文本）
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      el.innerHTML = getText(key, lang);
    });

    // data-i18n-placeholder: 替换 placeholder 属性
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = getText(key, lang);
    });

    // data-i18n-title: 替换 title 属性
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      el.title = getText(key, lang);
    });

    // data-i18n-alt: 替换 alt 属性
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      el.alt = getText(key, lang);
    });

    // data-i18n-section: 按语言显示/隐藏内容区域
    document.querySelectorAll('[data-i18n-section]').forEach(function (el) {
      var sectionLang = el.getAttribute('data-i18n-section');
      el.style.display = sectionLang === lang ? '' : 'none';
    });

    // 更新 <html lang>
    document.documentElement.lang = lang === 'zh-CN' ? 'zh-CN' : 'en';

    // 更新 <title>
    var titleKey = document.querySelector('title[data-i18n-key]');
    if (titleKey) {
      var key = titleKey.getAttribute('data-i18n-key');
      document.title = getText(key, lang);
    }

    // 更新 <meta> 标签
    updateMeta('description', getText('meta.description', lang));
    updateMeta('og:title', getText('meta.ogTitle', lang), 'property');
    updateMeta('og:description', getText('meta.ogDescription', lang), 'property');
    updateMeta('twitter:title', getText('meta.ogTitle', lang));
    updateMeta('twitter:description', getText('meta.ogDescription', lang));

    // 更新语言切换按钮状态
    var langToggles = document.querySelectorAll('#lang-toggle, #lang-toggle-mobile');
    langToggles.forEach(function (btn) {
      btn.textContent = lang === 'zh-CN' ? 'EN' : '中文';
      btn.setAttribute('aria-label', lang === 'zh-CN' ? 'Switch to English' : '切换到中文');
    });
  }

  /** 更新 meta 标签 */
  function updateMeta(name, content, attr) {
    attr = attr || 'name';
    var selector = 'meta[' + attr + '="' + name + '"]';
    var meta = document.querySelector(selector);
    if (meta) {
      meta.setAttribute('content', content);
    }
  }

  /** 切换语言 */
  function switchLanguage(lang) {
    if (SUPPORTED_LANGS.indexOf(lang) === -1) return;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations(lang);
    window.__VC_CURRENT_LANG = lang;
  }

  /** 获取当前语言 */
  function getCurrentLanguage() {
    return window.__VC_CURRENT_LANG || DEFAULT_LANG;
  }

  /** 初始化 */
  function init() {
    var lang = detectLanguage();
    localStorage.setItem(STORAGE_KEY, lang);
    window.__VC_CURRENT_LANG = lang;
    applyTranslations(lang);

    // 绑定语言切换按钮（桌面端和移动端）
    var langToggles = document.querySelectorAll('#lang-toggle, #lang-toggle-mobile');
    langToggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var current = getCurrentLanguage();
        var next = current === 'zh-CN' ? 'en' : 'zh-CN';
        switchLanguage(next);
      });
    });
  }

  // 暴露 API
  window.VCI18n = {
    init: init,
    switchLanguage: switchLanguage,
    getCurrentLanguage: getCurrentLanguage,
    getText: getText,
  };

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
