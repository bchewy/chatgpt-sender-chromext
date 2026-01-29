const PRESETS = [
  '',
  'Summarize this page in a few concise paragraphs.',
  'Extract the key points and main takeaways from this page.',
  "Explain the content of this page like I'm 5 years old.",
  'List the pros and cons discussed on this page.',
  'What are the main arguments or claims made on this page?',
  'Translate the following content to [language]:'
];

document.addEventListener('DOMContentLoaded', () => {
  const presetSelect = document.getElementById('preset-select');
  const promptTextarea = document.getElementById('prompt-textarea');
  const sendBtn = document.getElementById('send-btn');
  const statusEl = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const modeText = document.getElementById('mode-text');
  const modeHtml = document.getElementById('mode-html');

  presetSelect.addEventListener('change', () => {
    const idx = parseInt(presetSelect.value, 10);
    if (!isNaN(idx) && PRESETS[idx]) {
      promptTextarea.value = PRESETS[idx];
      promptTextarea.focus();
    }
  });

  sendBtn.addEventListener('click', () => {
    const prompt = promptTextarea.value.trim();
    if (!prompt) {
      setStatus('Please enter a prompt', 'error');
      return;
    }

    const mode = modeHtml.checked ? 'html' : 'text';

    try { chrome.storage.local.set({ lastPrompt: prompt, lastMode: mode }); } catch (_) {}

    sendBtn.disabled = true;
    setStatus('Extracting content\u2026', 'loading');

    try {
      chrome.runtime.sendMessage({
        action: 'sendToChatGPT',
        prompt: prompt,
        mode: mode
      });
    } catch (_) {
      setStatus('Extension context required', 'error');
      sendBtn.disabled = false;
    }
  });

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'status') {
        setStatus(message.text, message.variant || 'info');
        if (message.variant === 'error' || message.variant === 'success') {
          sendBtn.disabled = false;
        }
      }
    });
  } catch (_) {}

  loadSavedState();

  function loadSavedState() {
    try {
      chrome.storage.local.get(['lastPrompt', 'lastMode'], (result) => {
        if (result.lastPrompt) {
          promptTextarea.value = result.lastPrompt;
        }
        if (result.lastMode === 'html') {
          modeHtml.checked = true;
        }
      });
    } catch (_) {}
  }

  function setStatus(text, variant) {
    statusEl.className = 'status status--' + (variant || 'info');
    statusText.textContent = text;
  }
});
