// Service worker currently handles:
// - Future: right-click context menu export
// - Future: keyboard shortcut export
//
// Batch export runs entirely via content scripts (sessionStorage queue),
// so the service worker is minimal for now.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_BATCH_STATE') {
    // Content scripts manage batch state via sessionStorage;
    // service worker can relay messages if needed.
    sendResponse({ ok: true });
  }
});
