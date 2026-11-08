# Advanced QR Pro

A lightweight **Chrome Manifest V3** extension that decodes QR codes from a **user-selected region** on any webpage.

Click the floating **QR** ball → drag a box around the code → copy or open the result.

![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Version](https://img.shields.io/badge/version-1.2.2-blue.svg)

## Features

- **Region select** with crosshair overlay
- **jsQR** decoding (vendored)
- **Safe result UI** (decoded text is never injected via `innerHTML`)
- **Per-site floating ball position**
- **Esc / right-click** to cancel selection
- Drag vs click threshold so tiny mouse moves do not start a drag
- Toast feedback instead of blocking `alert`s
- Crop scaling based on capture size vs viewport (better with browser zoom)

## Install (developer / unpacked)

1. Clone or download this repository.
2. Open `chrome://extensions` (or Edge `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose this folder.
5. Open any page and use the **QR** floating control.

> Chromium-based browsers only (Chrome, Edge, Brave, Arc, etc.).

## Usage

| Action | How |
|--------|-----|
| Move the ball | Drag it (moves > 5px count as drag) |
| Start scan | Click the ball |
| Select QR | Drag a rectangle over the code |
| Cancel | `Esc` or right-click during selection |
| Copy / open | Use buttons in the result dialog |
| Close result | `×` or `Esc` |

Positions are stored **per hostname** in `chrome.storage.local`.

## Project layout

```text
.
├── manifest.json          # MV3 extension manifest
├── background.js          # captureVisibleTab service worker
├── content.js             # UI + crop + decode orchestration
├── jsQR.js                # Vendored decoder (Apache-2.0)
├── icons/                 # Extension icons
├── LICENSE                # MIT (project code)
├── THIRD_PARTY_NOTICES.md # jsQR attribution
├── PRIVACY.md             # Privacy notes
└── CONTRIBUTING.md
```

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Remember ball position per site |
| `activeTab` / `scripting` | Standard extension capabilities |
| Host / content script `<all_urls>` | Inject scanner UI and capture the visible tab when you scan |

Screenshots are taken **only after you select a region**, used locally for decoding, and not uploaded by this extension. See [PRIVACY.md](./PRIVACY.md).

## Security notes

- Decoded QR text is rendered with DOM APIs / `textarea.value` (XSS-safe).
- Only `http:` / `https:` links are opened directly; other payloads fall back to a web search.
- Treat QR contents from untrusted pages as untrusted data (as you would any scanned code).

## Limitations

- Needs a normal browsable tab (Chrome Web Store, `chrome://` pages, etc. cannot be captured).
- Very small selection boxes are rejected.
- Extreme multi-monitor / OS scale edge cases may still mis-crop; adjust the selection and retry.
- Injects on all URLs by design for personal convenience; forks may switch to on-demand injection.

## Development

No build step. Edit the JS files and reload the extension.

Optional pack for sharing:

```bash
# from repo root
zip -r advanced-qr-pro.zip manifest.json background.js content.js jsQR.js icons README.md LICENSE PRIVACY.md THIRD_PARTY_NOTICES.md
```

## Third-party

QR decoding is powered by [jsQR](https://github.com/cozmo/jsQR) (Apache License 2.0). See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## License

Project code is released under the [MIT License](./LICENSE).

## 中文简介

在网页上用悬浮球框选区域，识别二维码并复制 / 打开结果。基于 Chrome MV3，本地解码，无后台上传。

安装：`chrome://extensions` → 开发者模式 → **加载已解压的扩展程序** → 选择本仓库目录。

| 操作 | 说明 |
|------|------|
| 拖动悬浮球 | 移动位置（按网站分别记忆） |
| 点击悬浮球 | 进入框选 |
| Esc / 右键 | 取消框选 |
| COPY / OPEN | 复制结果或打开链接 |

更多说明见上方英文文档与 [PRIVACY.md](./PRIVACY.md)。
