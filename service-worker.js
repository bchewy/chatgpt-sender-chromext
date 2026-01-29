const MAX_CONTENT_LENGTH = 100000;
const PRIVILEGED_SCHEMES = ['chrome:', 'about:', 'edge:', 'chrome-extension:', 'chrome-devtools:', 'view-source:'];

chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Page Sender extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendToChatGPT') {
    handleSendToChatGPT(message.prompt, message.mode);
  }
  return false;
});

async function handleSendToChatGPT(prompt, mode) {
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

    const originalLength = content.length;
    if (originalLength > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH);
      content += `\n\n[Content truncated at 100,000 characters. Original length: ${originalLength} characters.]`;
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

  } catch (err) {
    console.error('Error in handleSendToChatGPT:', err);
    sendStatusToPopup('Unexpected error: ' + err.message, 'error');
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
  try {
    chrome.runtime.sendMessage({
      type: 'status',
      text: text,
      variant: variant
    });
  } catch (err) {
    console.log('Could not send status to popup:', text);
  }
}
