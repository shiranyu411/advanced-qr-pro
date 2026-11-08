# Contributing

Thanks for considering a contribution.

## Development

1. Clone the repository.
2. Open Chrome → `chrome://extensions`.
3. Enable **Developer mode**.
4. **Load unpacked** → select this repository root (the folder that contains `manifest.json`).
5. After code changes, click **Reload** on the extension card, then refresh target pages.

## Scope notes

- Keep the core flow simple: floating ball → drag-select → screenshot crop → decode → result.
- Prefer small, focused PRs.
- Do not commit secrets, personal profiles, or generated `.crx` / `.pem` files.
- Vendored `jsQR.js` should stay attributed in `THIRD_PARTY_NOTICES.md`.

## Code style

- Vanilla JS, no build step required.
- Avoid inserting untrusted QR payload via `innerHTML`.
