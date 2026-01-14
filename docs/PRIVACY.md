# Video Companion 隐私政策

**最后更新日期：2025年1月14日**

---

## 概述

Video Companion（以下简称"本扩展"）是一款用于增强网页视频播放体验的浏览器扩展。我们非常重视用户隐私，本隐私政策旨在说明本扩展如何处理用户数据。

**核心承诺：本扩展不收集、存储或传输任何用户个人数据。**

---

## 1. 数据收集

### 我们不收集的数据

- 个人身份信息（姓名、邮箱、电话等）
- 浏览历史记录
- 搜索查询
- 密码或登录凭证
- 支付信息
- 位置数据
- IP 地址
- 设备标识符

### 本地存储的数据

本扩展仅在用户本地浏览器中存储以下设置偏好：

| 数据类型 | 用途 | 存储位置 |
|---------|------|---------|
| 默认播放速度 | 记住用户偏好的播放速度 | 本地 Chrome Storage |
| 面板显示设置 | 记住控制面板显示偏好 | 本地 Chrome Storage |
| 自动隐藏延迟 | 自定义面板自动隐藏时间 | 本地 Chrome Storage |

这些数据：
- 完全存储在用户本地设备上
- 不会上传到任何服务器
- 不会与任何第三方共享
- 用户可随时通过卸载扩展来删除

---

## 2. 权限使用说明

本扩展请求以下浏览器权限，仅用于实现核心功能：

### 2.1 主机权限 (`<all_urls>`)

**用途**：检测并增强任意网页中的 HTML5 视频元素。

**原因**：视频可能出现在任何网站上，扩展需要能够识别并为这些视频添加控制功能。

**不会用于**：
- 读取或修改非视频相关的页面内容
- 收集用户浏览数据
- 追踪用户行为

### 2.2 activeTab 权限

**用途**：在用户主动点击扩展图标或使用快捷键时，获取当前标签页的访问权限。

**触发条件**：仅在用户主动交互时激活，不会自动访问任何标签页。

### 2.3 scripting 权限

**用途**：将内容脚本注入网页，以实现视频检测和控制面板功能。

**注入的脚本功能**：
- 检测页面中的 `<video>` 元素
- 添加视频控制面板 UI
- 响应用户的快捷键操作

### 2.4 storage 权限

**用途**：在本地存储用户设置偏好。

**存储内容**：仅存储上述"本地存储的数据"表格中列出的设置项。

### 2.5 contextMenus 权限

**用途**：在用户右键点击视频时显示快捷菜单，提供画中画、截图等快捷操作。

---

## 3. 第三方服务

本扩展：
- **不使用**任何第三方分析服务（如 Google Analytics）
- **不使用**任何广告服务
- **不使用**任何用户追踪服务
- **不连接**任何外部服务器
- **不加载**任何远程代码

所有功能代码均在本地打包，完全离线运行。

---

## 4. 数据安全

- 本扩展不传输任何数据，因此不存在数据泄露风险
- 所有本地存储的设置使用 Chrome 官方提供的 Storage API，受浏览器安全机制保护
- 源代码开源，接受公众审查

---

## 5. 儿童隐私

本扩展不针对 13 岁以下儿童设计，也不会有意收集儿童的任何信息。由于本扩展不收集任何用户数据，因此不存在收集儿童数据的风险。

---

## 6. 隐私政策变更

如本隐私政策发生重大变更，我们将：
- 更新本文档的"最后更新日期"
- 在扩展更新说明中告知用户

建议用户定期查阅本隐私政策以了解最新信息。

---

## 7. 用户权利

用户有权：
- **访问**：查看本扩展存储的所有本地数据（通过 Chrome 开发者工具）
- **删除**：通过卸载扩展删除所有本地数据
- **控制**：随时禁用或启用扩展

---

## 8. 联系方式

如对本隐私政策有任何疑问，请通过以下方式联系我们：

- **邮箱**：hao131462@qq.com
- **GitHub**：https://github.com/wh131462

---

## 9. 合规声明

本扩展遵守：
- Chrome Web Store 开发者计划政策
- 通用数据保护条例 (GDPR) 的相关要求
- 加州消费者隐私法案 (CCPA) 的相关要求

---

# Privacy Policy (English)

**Last Updated: January 14, 2025**

## Overview

Video Companion (hereinafter "the Extension") is a browser extension designed to enhance the web video playback experience. We take user privacy seriously. This privacy policy explains how the Extension handles user data.

**Core Commitment: This Extension does not collect, store, or transmit any personal user data.**

## Data Collection

### What We Don't Collect
- Personal identification information
- Browsing history
- Search queries
- Passwords or credentials
- Payment information
- Location data
- IP addresses
- Device identifiers

### Local Storage
The Extension only stores the following preferences locally:
- Default playback speed
- Panel display settings
- Auto-hide delay time

This data is stored entirely on the user's local device using Chrome's Storage API and is never transmitted externally.

## Permissions

| Permission | Purpose |
|------------|---------|
| `<all_urls>` | Detect and enhance HTML5 videos on any website |
| `activeTab` | Access current tab only when user actively interacts |
| `scripting` | Inject content scripts to add video controls |
| `storage` | Store user preferences locally |
| `contextMenus` | Provide right-click menu options for videos |

## Third-Party Services

This Extension does not use any third-party analytics, advertising, or tracking services. All code runs locally and offline.

## Contact

For questions about this privacy policy, please contact:
- **Email**: hao131462@qq.com
- **GitHub**: https://github.com/wh131462

---

*This privacy policy is effective as of the date stated above.*
