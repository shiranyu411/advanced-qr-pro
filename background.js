/**
 * Advanced QR Pro — service worker
 * Captures the visible tab when the content script requests a screenshot.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'getScreenshot') {
    try {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            error: chrome.runtime.lastError.message || 'Screenshot failed',
          });
          return;
        }
        if (!dataUrl) {
          sendResponse({
            error: 'Empty screenshot (system pages may be unsupported)',
          });
          return;
        }
        sendResponse({ dataUrl: dataUrl });
      });
    } catch (err) {
      sendResponse({
        error: err && err.message ? err.message : String(err),
      });
    }
    return true; // async response
  }
});
