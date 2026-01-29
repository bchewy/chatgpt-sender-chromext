// Service Worker for ChatGPT Page Sender
// MV3 service worker - handles background tasks and events

chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Page Sender extension installed');
});
