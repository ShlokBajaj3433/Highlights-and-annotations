/** Content script - page interaction, highlighting, presence, DOM observation */

import type { ExtensionMessage, HighlightTextMessage } from '@shared/messages';
import type { Highlight, ShareLevel } from '@shared/types';
import { extractDomain, getCanonicalUrl } from '@shared/url';

// Shadow DOM container for highlight rendering
let shadowRoot: ShadowRoot | null = null;
let highlightContainer: HTMLElement | null = null;
let highlightMode = false;
let currentPageKey = '';
let currentShareLevel: ShareLevel = 'hidden';
const _currentUserColor = '';
const _currentWorkspaceId = '';
const _currentUserId = '';
const userHighlights: Map<string, Highlight> = new Map();

// Initialize
function initialize(): void {
  createShadowDOM();
  setupMessageListener();
  setupSelectionListener();
  setupSPANavigationListener();
  reportPageInfo();

  console.log('Copage content script initialized');
}

function createShadowDOM(): void {
  if (shadowRoot) {
    return;
  }

  const container = document.createElement('div');
  container.id = 'copage-shadow-host';
  container.style.cssText =
    'all: initial; position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483646;';
  document.documentElement.appendChild(container);

  shadowRoot = container.attachShadow({ mode: 'open' });

  highlightContainer = document.createElement('div');
  highlightContainer.id = 'copage-highlights';
  highlightContainer.style.cssText =
    'all: initial; position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: auto;';
  shadowRoot.appendChild(highlightContainer);

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    .copage-highlight {
      position: absolute;
      background: var(--highlight-bg, rgba(0, 123, 255, 0.15));
      border-left: 3px solid var(--highlight-color, #007bff);
      border-radius: 2px;
      pointer-events: auto;
      cursor: pointer;
      transition: background 0.2s;
    }
    .copage-highlight:hover {
      background: var(--highlight-hover-bg, rgba(0, 123, 255, 0.3));
    }
    .copage-highlight.orphaned {
      border-style: dashed;
      opacity: 0.7;
    }
    .copage-highlight-tooltip {
      position: absolute;
      background: #1a1a2e;
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .copage-cursor {
      position: absolute;
      width: 2px;
      height: 20px;
      pointer-events: none;
      z-index: 2147483646;
    }
    .copage-cursor-label {
      position: absolute;
      top: -20px;
      left: 0;
      background: var(--cursor-color);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      white-space: nowrap;
      transform: translateX(-50%);
    }
  `;
  shadowRoot.appendChild(style);
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, _sendResponse) => {
    handleMessage(message);
    return true;
  });
}

async function handleMessage(message: ExtensionMessage): Promise<void> {
  switch (message.type) {
    case 'PAGE_INFO_RESPONSE':
      currentPageKey = message.payload.pageKey;
      currentShareLevel = message.payload.shareLevel;
      break;
    case 'HIGHLIGHT_CREATED':
      await renderHighlight(message.payload.highlight);
      break;
    case 'HIGHLIGHT_UPDATED':
      updateHighlight(message.payload.highlight);
      break;
    case 'HIGHLIGHT_DELETED':
      removeHighlight(message.payload.highlightId);
      break;
    case 'PRESENCE_UPDATE':
      updatePresence(message.payload);
      break;
    case 'HIGHLIGHT_TEXT':
      await handleHighlightText(message.payload);
      break;
    case 'GET_HIGHLIGHTS':
      sendHighlightsResponse(message.payload.pageKey);
      break;
    case 'NEW_PAGE_NOTE':
      handleNewPageNote(message.payload.url);
      break;
    case 'REALTIME_STATUS':
      // Connection status changed
      break;
  }
}

async function reportPageInfo(): Promise<void> {
  const url = window.location.href;
  const _title = document.title;
  const _domain = extractDomain(url);
  const _canonicalUrl = getCanonicalUrl(document);

  chrome.runtime.sendMessage({
    type: 'GET_PAGE_INFO',
    timestamp: Date.now(),
    payload: { tabId: 0 }, // Will be filled by background
  });
}

function setupSelectionListener(): void {
  document.addEventListener('mouseup', handleSelection);
  document.addEventListener('touchend', handleSelection);
}

function handleSelection(): void {
  if (!highlightMode) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }

  const text = selection.toString().trim();
  if (!text || text.length < 2) {
    return;
  }

  const range = selection.getRangeAt(0);
  const quote = extractQuote(range, text);
  const position = getTextPosition(range);
  const xpath = getXPath(range.startContainer);

  chrome.runtime.sendMessage({
    type: 'HIGHLIGHT_TEXT',
    timestamp: Date.now(),
    payload: { quote, position, xpath },
  });
}

function extractQuote(
  range: Range,
  exact: string
): { exact: string; prefix: string; suffix: string } {
  const textContent = document.body?.textContent || '';
  const startOffset = getCharacterOffset(range.startContainer, range.startOffset);
  const endOffset = startOffset + exact.length;

  const prefixStart = Math.max(0, startOffset - 20);
  const suffixEnd = Math.min(textContent.length, endOffset + 20);

  return {
    exact,
    prefix: textContent.slice(prefixStart, startOffset),
    suffix: textContent.slice(endOffset, suffixEnd),
  };
}

function getCharacterOffset(node: Node, offset: number): number {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;

  while (walker.nextNode()) {
    if (walker.currentNode === node) {
      return currentOffset + offset;
    }
    currentOffset += walker.currentNode.textContent?.length || 0;
  }

  return 0;
}

function getTextPosition(range: Range): { start: number; end: number } {
  const _textContent = document.body?.textContent || '';
  const startOffset = getCharacterOffset(range.startContainer, range.startOffset);
  const endOffset = getCharacterOffset(range.endContainer, range.endOffset);

  return { start: startOffset, end: endOffset };
}

function getXPath(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode!;
  }

  const parts: string[] = [];
  let current: Node | null = node;

  while (current && current !== document.body) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentNode;
  }

  return `/html/body/${parts.join('/')}`;
}

async function handleHighlightText(payload: HighlightTextMessage['payload']): Promise<void> {
  const workspaceId = await getWorkspaceId();
  const user = await getUser();

  if (!workspaceId || !user) {
    return;
  }

  const highlight: Highlight = {
    id: crypto.randomUUID(),
    workspaceId,
    pageKey: currentPageKey,
    userId: user.id,
    color: user.color,
    quote: payload.quote,
    position: payload.position,
    xpath: payload.xpath,
    commentCount: 0,
    isOrphaned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Render optimistically
  await renderHighlight(highlight);

  // Send to background for sync
  chrome.runtime.sendMessage({
    type: 'CREATE_HIGHLIGHT',
    timestamp: Date.now(),
    payload: {
      pageKey: currentPageKey,
      ...payload,
      color: user.color,
    },
  });
}

async function renderHighlight(highlight: Highlight): Promise<void> {
  if (!highlightContainer || !shadowRoot) {
    return;
  }

  const range = findHighlightRange(highlight);
  if (!range) {
    // Orphaned - render in side panel only
    highlight.isOrphaned = true;
    userHighlights.set(highlight.id, highlight);
    return;
  }

  const rects = range.getClientRects();
  if (rects.length === 0) {
    return;
  }

  // Create highlight elements for each rect
  for (const rect of rects) {
    const el = document.createElement('div');
    el.className = `copage-highlight${highlight.isOrphaned ? ' orphaned' : ''}`;
    el.dataset.highlightId = highlight.id;
    el.style.cssText = `
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      --highlight-color: ${highlight.color};
      --highlight-bg: ${hexToRgba(highlight.color, 0.15)};
      --highlight-hover-bg: ${hexToRgba(highlight.color, 0.3)};
    `;

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'copage-highlight-tooltip';
    tooltip.textContent = `${highlight.quote.exact.slice(0, 50)}...`;
    el.appendChild(tooltip);

    el.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_CLICKED',
        timestamp: Date.now(),
        payload: { highlightId: highlight.id },
      });
    });

    highlightContainer.appendChild(el);
  }

  userHighlights.set(highlight.id, highlight);
}

function findHighlightRange(highlight: Highlight): Range | null {
  const textContent = document.body?.textContent || '';

  // 1. Exact match with prefix/suffix
  const searchText = highlight.quote.prefix + highlight.quote.exact + highlight.quote.suffix;
  const index = textContent.indexOf(searchText);

  if (index !== -1) {
    const range = document.createRange();
    const startNode = findTextNodeAtOffset(textContent, index + highlight.quote.prefix.length);
    const endNode = findTextNodeAtOffset(
      textContent,
      index + highlight.quote.prefix.length + highlight.quote.exact.length
    );

    if (startNode && endNode) {
      range.setStart(startNode.node, startNode.offset);
      range.setEnd(endNode.node, endNode.offset);
      return range;
    }
  }

  // 2. Fuzzy match (simplified - would use diff-match-patch in production)
  const exactIndex = textContent.indexOf(highlight.quote.exact);
  if (exactIndex !== -1) {
    const range = document.createRange();
    const startNode = findTextNodeAtOffset(textContent, exactIndex);
    const endNode = findTextNodeAtOffset(textContent, exactIndex + highlight.quote.exact.length);

    if (startNode && endNode) {
      range.setStart(startNode.node, startNode.offset);
      range.setEnd(endNode.node, endNode.offset);
      return range;
    }
  }

  // 3. Position-based (if page length similar)
  if (Math.abs(textContent.length - highlight.position.end) < 500) {
    const startNode = findTextNodeAtOffset(textContent, highlight.position.start);
    const endNode = findTextNodeAtOffset(textContent, highlight.position.end);

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode.node, startNode.offset);
      range.setEnd(endNode.node, endNode.offset);
      return range;
    }
  }

  // 4. XPath (simplified)
  // Would implement full XPath evaluation here

  return null;
}

function findTextNodeAtOffset(
  _textContent: string,
  offset: number
): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nodeLength = node.textContent?.length || 0;

    if (currentOffset + nodeLength >= offset) {
      return { node, offset: offset - currentOffset };
    }

    currentOffset += nodeLength;
  }

  return null;
}

function hexToRgba(hex: string, alpha: number): string {
  // Handle hsl format
  if (hex.startsWith('hsl')) {
    return hex.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  }

  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateHighlight(highlight: Highlight): void {
  // Re-render
  removeHighlight(highlight.id);
  renderHighlight(highlight);
}

function removeHighlight(highlightId: string): void {
  if (!highlightContainer) {
    return;
  }

  const elements = highlightContainer.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
  elements.forEach((el) => el.remove());
  userHighlights.delete(highlightId);
}

function updatePresence(payload: {
  pageKey: string;
  users: Array<{ userId: string; userName: string; userColor: string; shareLevel: ShareLevel }>;
}): void {
  // Render presence cursors/avatars
  console.log('Presence update:', payload);
}

function sendHighlightsResponse(pageKey: string): void {
  const highlights = Array.from(userHighlights.values()).filter((h) => h.pageKey === pageKey);
  chrome.runtime.sendMessage({
    type: 'HIGHLIGHTS_RESPONSE',
    timestamp: Date.now(),
    payload: { highlights },
  });
}

function handleNewPageNote(url: string): void {
  // Open side panel to notes tab
  chrome.runtime.sendMessage({
    type: 'OPEN_SIDE_PANEL',
    timestamp: Date.now(),
    payload: { tab: 'notes', url },
  });
}

function setupSPANavigationListener(): void {
  // Detect SPA navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handleSPANavigation();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    handleSPANavigation();
  };

  window.addEventListener('popstate', handleSPANavigation);
  window.addEventListener('hashchange', handleSPANavigation);
}

function handleSPANavigation(): void {
  // Re-report page info for new URL
  setTimeout(() => {
    reportPageInfo();
    // Re-render highlights for new page
    userHighlights.forEach((h) => {
      if (h.pageKey === currentPageKey) {
        renderHighlight(h);
      }
    });
  }, 100);
}

// Storage helpers
async function getWorkspaceId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_WORKSPACE_ID', timestamp: Date.now() }, (response) => {
      resolve(response?.workspaceId || '');
    });
  });
}

async function getUser(): Promise<{ id: string; color: string } | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_USER', timestamp: Date.now() }, (response) => {
      resolve(response?.user || null);
    });
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.shiftKey) {
    switch (e.key.toLowerCase()) {
      case 'h':
        e.preventDefault();
        highlightMode = !highlightMode;
        console.log('Highlight mode:', highlightMode);
        break;
    }
  }
});

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

export { initialize, highlightMode, currentPageKey, currentShareLevel };
