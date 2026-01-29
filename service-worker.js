const MAX_CONTENT_LENGTH = 100000;
const PRIVILEGED_SCHEMES = ['chrome:', 'about:', 'edge:', 'chrome-extension:', 'chrome-devtools:', 'view-source:'];

let isProcessing = false;
// Ensure session storage is accessible from content scripts on every startup
try { chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' }); } catch (_) {}

chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Page Sender extension installed');
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendToChatGPT') {
    handleSendToChatGPT(message.prompt, message.mode);
  }
  return false;
});

async function handleSendToChatGPT(prompt, mode) {
  if (isProcessing) {
    console.log('Already processing a request, ignoring duplicate');
    return;
  }
  
  isProcessing = true;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab || !activeTab.id) {
      sendStatusToPopup('No active tab found', 'error');
      return;
    }

    const tabUrl = activeTab.url || '';
    if (isPrivilegedUrl(tabUrl)) {
      sendStatusToPopup('Cannot extract content from privileged pages (chrome://, about:, etc.)', 'error');
      return;
    }

    sendStatusToPopup('Extracting content…', 'loading');

    let content;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: mode === 'html' ? extractHTML : extractText
      });

      if (!results || !results[0] || typeof results[0].result !== 'string') {
        sendStatusToPopup('Failed to extract content from page', 'error');
        return;
      }

      content = results[0].result;
    } catch (err) {
      console.error('Content extraction error:', err);
      sendStatusToPopup('Cannot access page content. Try reloading the page.', 'error');
      return;
    }

    if (!content || content.trim().length === 0) {
      sendStatusToPopup('Page appears to have no content.', 'error');
      return;
    }

    const originalLength = content.length;
    if (originalLength > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH);
      content += `\n\n[Content truncated at 100,000 characters. Original length: ${originalLength} characters.]`;
      sendStatusToPopup(`Content truncated from ${originalLength.toLocaleString()} to 100,000 characters.`, 'info');
    }

    let formattedMessage;
    if (mode === 'html') {
      formattedMessage = `${prompt}\n\n\`\`\`\`html\n${content}\n\`\`\`\``;
    } else {
      formattedMessage = `${prompt}\n\n${content}`;
    }

    await chrome.storage.session.set({ pendingMessage: formattedMessage });

    sendStatusToPopup('Opening ChatGPT…', 'loading');
    
    console.log('Content extracted and stored. Length:', formattedMessage.length);

    chrome.alarms.create('keepAlive', { delayInMinutes: 0.5 });

    const chatGPTTab = await chrome.tabs.create({
      url: 'https://chatgpt.com/',
      active: true
    });

    sendStatusToPopup('Waiting for ChatGPT to load…', 'loading');

    const onChatGPTLoaded = async (tabId, changeInfo, tab) => {
      if (tabId !== chatGPTTab.id) return;
      if (changeInfo.status !== 'complete') return;

      const url = tab.url || '';
      const isChatGPTUrl = url.includes('chatgpt.com') || url.includes('chat.openai.com');
      
      if (!isChatGPTUrl) {
        console.log('ChatGPT tab redirected to:', url);
        return;
      }

      console.log('ChatGPT loaded, injecting content...');
      sendStatusToPopup('Injecting content…', 'loading');

      chrome.tabs.onUpdated.removeListener(onChatGPTLoaded);
      chrome.alarms.clear('keepAlive');

      try {
        await chrome.scripting.executeScript({
          target: { tabId: chatGPTTab.id },
          files: ['chatgpt-injector.js']
        });

        sendStatusToPopup('Content sent to ChatGPT!', 'success');
        console.log('Injection complete');
      } catch (injectErr) {
        console.error('Injection error:', injectErr);
        sendStatusToPopup('Failed to inject content: ' + injectErr.message, 'error');
      }
    };

    chrome.tabs.onUpdated.addListener(onChatGPTLoaded);

  } catch (err) {
    console.error('Error in handleSendToChatGPT:', err);
    sendStatusToPopup('Unexpected error: ' + err.message, 'error');
    
    try {
      chrome.alarms.clear('keepAlive');
    } catch (_) {}
  } finally {
    isProcessing = false;
  }
}

function isPrivilegedUrl(url) {
  if (!url) return false;
  return PRIVILEGED_SCHEMES.some(scheme => url.startsWith(scheme));
}

function extractText() {
  return document.body.innerText;
}

function extractHTML() {
  return document.documentElement.outerHTML;
}

function sendStatusToPopup(text, variant) {
  chrome.runtime.sendMessage({
    type: 'status',
    text: text,
    variant: variant
  }).catch(() => {
    // Popup is closed — expected after ChatGPT tab opens
  });
}
