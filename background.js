// Google Meet 明るさ・美肌フィルター拡張機能のバックグラウンドスクリプト
// Manifest V3 サービスワーカー

chrome.runtime.onInstalled.addListener(() => {
  console.log('Google Meet 明るさ・美肌フィルター拡張機能がインストールされました');
});

// Handle extension icon click (optional)
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('meet.google.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSettings') {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'loadSettings') {
    chrome.storage.local.get(['brightness', 'skinSmoothing'], (result) => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
});
