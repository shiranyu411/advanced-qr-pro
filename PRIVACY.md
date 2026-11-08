# Privacy Policy

Advanced QR Pro is a local browser extension. It does not include analytics, advertising, accounts, or remote backends.

## Data handling

| Data | Where | Purpose |
|------|--------|---------|
| Floating-button position per site | `chrome.storage.local` on your device | Remember UI placement |
| Visible-tab screenshot | Memory only, during a scan you start | Crop and decode the selected region |
| Decoded QR text | Shown in the result dialog; optional clipboard | Let you copy / open results |

## Network

- The extension does **not** upload screenshots or QR contents to any server.
- Opening a decoded URL uses your browser / system as usual.
- No telemetry is collected by this project.

## Permissions

- `activeTab` / `scripting` / `storage` — extension plumbing and position memory
- `<all_urls>` host + content scripts — inject the scanner UI and capture the tab you are viewing when you scan

If you fork this project and add network features, update this document.
