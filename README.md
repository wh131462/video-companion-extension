# Video Companion

**English** | [中文](README.zh.md)

> Web video enhancer - PiP, speed control (0.25x-16x), screenshot, download, web fullscreen. Supports YouTube, Bilibili, Tencent Video and more.

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/nmkklhdipnadeimbnimllidjgccbifhm?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/video-companion/nmkklhdipnadeimbnimllidjgccbifhm)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/nmkklhdipnadeimbnimllidjgccbifhm?label=Users&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/video-companion/nmkklhdipnadeimbnimllidjgccbifhm)
[![License](https://img.shields.io/github/license/wh131462/video-companion-extension)](LICENSE)

## Why Video Companion?

Most video platforms lock you into their built-in player with limited controls. Video Companion breaks those limits and puts you in charge:

- **Watch Your Way** — Speed up lectures to 16x, slow down tutorials to 0.25x, or find your perfect pace with fine-grained speed control.
- **Multitask with Picture-in-Picture** — Pop any video out of the browser tab and keep watching while you work, browse, or take notes.
- **Save What Matters** — Screenshot any frame instantly or download videos (including HLS/m3u8 streams) for offline viewing.
- **Play Any Video Link** — Paste an m3u8, mp4, or webm URL and play it directly in the browser. No extra software needed.
- **Distraction-Free Viewing** — Web fullscreen fills your browser without entering system fullscreen, and you can hide native controls for a cleaner experience.
- **Lightweight & Privacy-Friendly** — No account required. No data collection. No ads. Runs entirely in your browser.

## Screenshots

| Control Panel (Default) | Control Panel (Clean) |
|:---:|:---:|
| ![Control Panel (Default)](docs/snapshots/controlPanel.png) | ![Control Panel (Clean)](docs/snapshots/controlPanelClean.png) |

| Context Menu | Custom Player |
|:---:|:---:|
| ![Context Menu](docs/snapshots/contextMenu.png) | ![Custom Player](docs/snapshots/player.png) |

| Play by Link |
|:---:|
| ![Play by Link](docs/snapshots/videoPlayer.png) |

## Features

### 🎬 Video Controls
| Feature | Description |
|------|------|
| Picture-in-Picture | Float video above other windows |
| Fullscreen | Native fullscreen mode |
| Web Fullscreen | Fill browser window without system fullscreen |
| Speed Control | 0.25x - 16x playback speed |
| Loop | Toggle video loop |
| Mute | Quick mute toggle |

### 🛠 Video Tools
| Feature | Description |
|------|------|
| Screenshot | Capture current frame as PNG |
| Download | Download video, supports HLS (m3u8) streaming |
| Play by Link | Play any video URL (m3u8, mp4, webm, etc.) |
| Stream Detection | Auto-detect m3u8 streaming sources |
| Hide Controls | Hide native video controls |

### 🌐 Smart Adaptation
- **Auto Detection** - Recognizes YouTube, Bilibili, Tencent Video, iQIYI, Youku, Xigua Video, etc.
- **Context Menu** - Enhanced right-click menu for all videos
- **Control Panel** - Floating panel for native video elements

### ⚙ Extension Settings
- **Popup Panel** - Click extension icon to toggle control panel and context menu
- **Language Switch** - Switch between Chinese and English in popup panel
- **State Memory** - Remember panel state for each video
- **Draggable** - Drag control panel to any position

## Usage

### Context Menu
Right-click on any video to access:
- Play/Pause
- Speed Control (submenu)
- Loop ✓
- Mute ✓
- Picture-in-Picture
- Fullscreen / Exit Fullscreen
- Web Fullscreen
- Screenshot
- Download Video
- Play by Link

### Control Panel
For native video elements, a floating control panel appears at the bottom:
- Shows on hover, auto-hides when mouse leaves
- Draggable to any position
- Click close button to hide
- Re-open via context menu

### Popup Panel
Click extension icon in browser toolbar:
- **Control Panel Toggle** - Enable/disable floating control panel
- **Context Menu Toggle** - Enable/disable enhanced context menu
- **Language Switch** - Switch between Chinese and English
- **Video Detection** - Shows number of videos detected on current page

## Keyboard Shortcuts

| Feature | Shortcut |
|------|--------|
| Picture-in-Picture | `Alt + P` |

## Installation

### From Chrome Web Store (Recommended)

[**👉 Install Video Companion**](https://chromewebstore.google.com/detail/video-companion/nmkklhdipnadeimbnimllidjgccbifhm)

### From Source

1. Clone repository
```bash
git clone https://github.com/wh131462/video-companion-extension.git
cd video-companion-extension
```

2. Install dependencies
```bash
npm install
```

3. Build extension
```bash
npm run build
```

4. Load extension
   - Open Chrome, visit `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Development

```bash
# Development mode (hot reload)
npm run dev

# Build production version
npm run build

# Build and package zip (for release)
npm run build:zip

# Run tests
npm test

# Test coverage
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint
```

### Project Structure

```
src/
├── background/        # Service Worker
│   ├── handlers/      # Message and command handlers
│   └── services/      # Storage service
├── content/           # Content scripts
│   ├── core/          # Core logic (video scanner, enhancer)
│   ├── features/      # Feature modules (speed, screenshot, download, etc.)
│   ├── handlers/      # Event handlers
│   ├── hls/           # HLS streaming (player, downloader, interceptor)
│   ├── styles/        # Styles
│   ├── ui/            # UI components (control panel, context menu, toast)
│   └── utils/         # Utilities
└── shared/            # Shared code (types, constants, utils)
```

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Modern build tool
- **Chrome Extension Manifest V3** - Latest extension standard
- **Vitest** - Unit testing framework

## Supported Websites

Extension auto-detects custom players on these sites (context menu only):

| Platform | URL |
|------|------|
| YouTube | youtube.com |
| Bilibili | bilibili.com |
| Tencent Video | v.qq.com |
| iQIYI | iqiyi.com |
| Youku | youku.com |
| Xigua Video | ixigua.com |

For other sites using native `<video>` elements, both control panel and context menu are available.

## Browser Compatibility

| Browser | Minimum Version |
|--------|----------|
| Chrome | 122+ |
| Edge (Chromium) | 122+ |

## License

[MIT](LICENSE)

## Author

[EternalHeart](https://github.com/wh131462)

## Feedback & Contribution

If you encounter issues or have feature suggestions, feel free to submit an [Issue](https://github.com/wh131462/video-companion-extension/issues) or [Pull Request](https://github.com/wh131462/video-companion-extension/pulls).
