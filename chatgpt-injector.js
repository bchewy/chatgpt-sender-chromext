function findChatGPTEditor() {
  const selectors = [
    'div#prompt-textarea[contenteditable="true"]',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"][role="textbox"]'
  ];

  for (let i = 0; i < selectors.length; i++) {
    const element = document.querySelector(selectors[i]);
    if (element) {
      console.log(`[ChatGPT Injector] Found editor using selector ${i + 1}: ${selectors[i]}`);
      return element;
    }
  }

  console.error('[ChatGPT Injector] Could not find editor element after trying all selectors');
  return null;
}

function insertTextIntoEditor(element, text) {
  try {
    element.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    const execSuccess = document.execCommand('insertText', false, text);

    const inputEvent = new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText'
    });
    element.dispatchEvent(inputEvent);

    if (!execSuccess) {
      console.warn('[ChatGPT Injector] execCommand returned false, using fallback');
      element.textContent = text;
      
      const fallbackEvent = new InputEvent('input', {
        bubbles: true,
        inputType: 'insertFromPaste'
      });
      element.dispatchEvent(fallbackEvent);
    }

    console.log(`[ChatGPT Injector] Successfully inserted ${text.length} characters`);
    return true;
  } catch (error) {
    console.error('[ChatGPT Injector] Error inserting text:', error);
    return false;
  }
}

function pollForEditor() {
  return new Promise((resolve) => {
    const MAX_ATTEMPTS = 75;
    const POLL_INTERVAL_MS = 200;
    let attempts = 0;

    const intervalId = setInterval(() => {
      attempts++;
      
      const editor = findChatGPTEditor();
      if (editor) {
        clearInterval(intervalId);
        resolve(editor);
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        console.error('[ChatGPT Injector] Timeout: Could not find editor after 15 seconds');
        resolve(null);
      }
    }, POLL_INTERVAL_MS);
  });
}

async function injectMessage() {
  try {
    const result = await chrome.storage.session.get('pendingMessage');
    
    if (!result.pendingMessage) {
      console.log('[ChatGPT Injector] No pending message found');
      return;
    }

    const messageText = result.pendingMessage;
    console.log(`[ChatGPT Injector] Retrieved pending message: ${messageText.substring(0, 50)}...`);

    const editor = await pollForEditor();
    
    if (!editor) {
      console.error('[ChatGPT Injector] Failed to find editor element');
      return;
    }

    const success = insertTextIntoEditor(editor, messageText);

    if (success) {
      await chrome.storage.session.remove('pendingMessage');
      console.log('[ChatGPT Injector] Injection complete, cleaned up session storage');
    } else {
      console.error('[ChatGPT Injector] Failed to insert text');
    }
  } catch (error) {
    console.error('[ChatGPT Injector] Error in main injection logic:', error);
  }
}

injectMessage();
