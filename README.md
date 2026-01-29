# ChatGPT Page Sender

Send any web page's content to ChatGPT with a custom prompt.

## What It Does

Extracts content from the current page and opens ChatGPT with your prompt + content pre-filled in the editor. No copy-paste, no manual formatting.

**Features:**

- 6 preset prompts (summarize, key points, ELI5, pros/cons, arguments, translate)
- Two content modes: visible text or full HTML source
- Remembers your last prompt and mode
- Handles large pages (truncates at 100k characters)

## Install

1. Clone or download this repo
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `chatgpt-sender` folder

## Usage

1. Go to any web page
2. Click the extension icon in your toolbar
3. Pick a preset or write your own prompt
4. Choose content mode (visible text is recommended)
5. Hit **Send to ChatGPT**

A new ChatGPT tab opens with your prompt + page content ready in the editor. Review it, then send.

## Preset Prompts

| Preset | Prompt |
|--------|--------|
| Summarize | Summarize this page in a few concise paragraphs. |
| Key Points | Extract the key points and main takeaways from this page. |
| ELI5 | Explain the content of this page like I'm 5 years old. |
| Pros & Cons | List the pros and cons discussed on this page. |
| Arguments | What are the main arguments or claims made on this page? |
| Translate | Translate the following content to [language]: |

## Content Modes

**Visible Text** (recommended) — extracts readable text only. Clean and token-efficient.

**Full HTML Source** — extracts raw HTML including tags and structure. Wrapped in a code fence so ChatGPT treats it as content to analyze, not render.

## Technical Details

- Chrome Extension Manifest V3
- Vanilla JS — zero dependencies, no build step
- ProseMirror injection via `execCommand('insertText')` with fallback
- Session storage for passing content between service worker and content script
- Service worker keep-alive via `chrome.alarms` during async operations
- 100k character content limit with automatic truncation

## Known Limitations

- **ChatGPT login required** — you need to be signed into chatgpt.com
- **Privileged pages blocked** — chrome://, about:// pages can't be accessed (browser security)
- **No iframe content** — only extracts from the main document
- **Selector fragility** — ChatGPT DOM changes may break injection (fixable by updating selectors)
- **execCommand is deprecated** — still works in all browsers, but may need migration eventually

## License

MIT
