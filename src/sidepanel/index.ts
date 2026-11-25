/** Side panel UI logic */

import { getCurrentWorkspaceId, getUser, getWorkspaces } from '@shared/storage';
import type { Comment, Highlight, PageVisit, User } from '@shared/types';

// State
let currentUser: User | null = null;
let _currentWorkspaceId: string | null = null;
let currentPageKey = '';
let _currentPageUrl = '';
let currentPageTitle = '';
let highlights: Highlight[] = [];
const comments: Map<string, Comment[]> = new Map();
const _feedItems: PageVisit[] = [];
let activeTab = 'highlights';

// Elements
const pageTitle = document.getElementById('pageTitle') as HTMLSpanElement;
const presenceBadge = document.getElementById('presenceBadge') as HTMLDivElement;
const sidePresenceAvatars = document.getElementById('sidePresenceAvatars') as HTMLDivElement;
const sidePresenceCount = document.getElementById('sidePresenceCount') as HTMLSpanElement;
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const highlightsList = document.getElementById('highlightsList') as HTMLDivElement;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement;
const chatInput = document.getElementById('chatInput') as HTMLInputElement;
const chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement;
const feedList = document.getElementById('feedList') as HTMLDivElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const searchFilters = document.getElementById('searchFilters') as HTMLDivElement;
const searchResults = document.getElementById('searchResults') as HTMLDivElement;

// Initialize
async function initialize(): Promise<void> {
  await loadState();
  setupEventListeners();
  await loadPageInfo();
  render();

  chrome.runtime.onMessage.addListener(handleMessage);
}

async function loadState(): Promise<void> {
  const [user, workspaceId, _ws] = await Promise.all([
    getUser(),
    getCurrentWorkspaceId(),
    getWorkspaces(),
  ]);

  currentUser = user;
  _currentWorkspaceId = workspaceId;
}

function setupEventListeners(): void {
  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab!));
  });

  // Chat
  chatSendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Search
  searchInput.addEventListener('input', debounce(handleSearch, 300));

  // Buttons
  document.getElementById('notificationsBtn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

async function loadPageInfo(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'GET_PAGE_INFO', timestamp: Date.now(), payload: { tabId: 0 } },
      (response) => {
        if (response?.payload) {
          currentPageKey = response.payload.pageKey;
          _currentPageUrl = response.payload.url;
          currentPageTitle = response.payload.title;
          pageTitle.textContent = currentPageTitle || 'New Tab';
        }
        resolve();
      }
    );
  });
}

function switchTab(tabName: string): void {
  activeTab = tabName;

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `${tabName}Panel`);
  });

  // Load data for tab
  switch (tabName) {
    case 'highlights':
      loadHighlights();
      break;
    case 'chat':
      loadChat();
      break;
    case 'feed':
      loadFeed();
      break;
    case 'search':
      loadSearchFilters();
      break;
  }
}

function handleMessage(message: any): void {
  switch (message.type) {
    case 'PRESENCE_UPDATE':
      if (message.payload.pageKey === currentPageKey) {
        renderPresence(message.payload);
      }
      break;
    case 'HIGHLIGHT_CREATED':
      if (message.payload.highlight.pageKey === currentPageKey) {
        highlights.unshift(message.payload.highlight);
        if (activeTab === 'highlights') {
          renderHighlights();
        }
      }
      break;
    case 'HIGHLIGHT_DELETED':
      highlights = highlights.filter((h) => h.id !== message.payload.highlightId);
      if (activeTab === 'highlights') {
        renderHighlights();
      }
      break;
    case 'COMMENT_CREATED':
      if (activeTab === 'highlights') {
        renderHighlights();
      }
      break;
  }
}

function render(): void {
  renderPresence({ users: [], pageKey: currentPageKey });
}

function renderPresence(payload: {
  users: Array<{ userId: string; userName: string; userColor: string }>;
  pageKey: string;
}): void {
  const users = payload.users.filter((u) => u.userId !== currentUser?.id);

  if (users.length === 0) {
    presenceBadge.style.display = 'none';
    return;
  }

  presenceBadge.style.display = 'flex';
  sidePresenceCount.textContent = users.length.toString();

  sidePresenceAvatars.innerHTML = '';
  users.slice(0, 5).forEach((user) => {
    const avatar = document.createElement('div');
    avatar.className = 'presence-avatar';
    avatar.style.background = user.userColor;
    avatar.textContent = user.userName.charAt(0).toUpperCase();
    avatar.title = user.userName;
    sidePresenceAvatars.appendChild(avatar);
  });

  if (users.length > 5) {
    const more = document.createElement('div');
    more.className = 'presence-avatar';
    more.style.background = '#667eea';
    more.textContent = `+${users.length - 5}`;
    sidePresenceAvatars.appendChild(more);
  }
}

// Highlights
async function loadHighlights(): Promise<void> {
  highlightsList.innerHTML =
    '<div class="loading"><div class="spinner"></div>Loading highlights...</div>';

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'GET_HIGHLIGHTS', timestamp: Date.now(), payload: { pageKey: currentPageKey } },
      (response) => {
        highlights = response?.payload?.highlights || [];
        renderHighlights();
        resolve();
      }
    );
  });
}

function renderHighlights(): void {
  if (highlights.length === 0) {
    highlightsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🖍️</div>
        <div class="empty-state-title">No highlights yet</div>
        <div class="empty-state-desc">Select text on this page and right-click "Highlight for team"</div>
      </div>
    `;
    return;
  }

  highlightsList.innerHTML = highlights.map((highlight) => renderHighlightItem(highlight)).join('');

  // Add click handlers for comments
  highlightsList.querySelectorAll('.comment-reply-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const highlightId = (e.target as HTMLElement).dataset.highlightId!;
      showCommentInput(highlightId);
    });
  });

  highlightsList.querySelectorAll('.add-comment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const highlightId = (e.target as HTMLElement).dataset.highlightId!;
      const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
      addComment(highlightId, input.value);
    });
  });
}

function renderHighlightItem(highlight: Highlight): string {
  const highlightComments = comments.get(highlight.id) || [];
  const timeAgo = formatRelativeTime(highlight.createdAt);

  return `
    <div class="highlight-item ${highlight.isOrphaned ? 'orphaned' : ''}" data-highlight-id="${highlight.id}" style="--highlight-color: ${highlight.color};">
      <div class="highlight-header">
        <div class="highlight-avatar" style="background: ${highlight.color};">${highlight.userName?.charAt(0).toUpperCase() || '?'}</div>
        <span class="highlight-user">${highlight.userName || 'Unknown'}</span>
        <span class="highlight-time">${timeAgo}</span>
      </div>
      <div class="highlight-quote">${escapeHtml(highlight.quote.exact)}</div>
      ${
        highlightComments.length > 0
          ? `
        <div class="highlight-comments">
          ${highlightComments.map((c) => renderComment(c, 0)).join('')}
        </div>
      `
          : ''
      }
      <div class="add-comment">
        <input type="text" class="add-comment-input" placeholder="Add a comment..." data-highlight-id="${highlight.id}">
        <button class="add-comment-btn" data-highlight-id="${highlight.id}">Comment</button>
      </div>
    </div>
  `;
}

function renderComment(comment: Comment, depth: number): string {
  const timeAgo = formatRelativeTime(comment.createdAt);
  const replies = comments.get(comment.id) || [];
  const indent = depth > 0 ? 'comment-reply' : '';

  return `
    <div class="comment ${indent}" data-comment-id="${comment.id}" style="${depth > 0 ? 'margin-left:28px;border-left:1px solid #eee;padding-left:8px;' : ''}">
      <div class="comment-avatar" style="background: ${comment.userColor};">${comment.userName?.charAt(0).toUpperCase() || '?'}</div>
      <div class="comment-content">
        <span class="comment-author">${comment.userName || 'Unknown'}</span>
        <span>${escapeHtml(comment.content)}</span>
        <span class="comment-time">${timeAgo}</span>
      </div>
      ${replies.length > 0 ? `<div>${replies.map((r) => renderComment(r, depth + 1)).join('')}</div>` : ''}
    </div>
  `;
}

function showCommentInput(_highlightId: string): void {
  // Already visible in render
}

async function addComment(highlightId: string, content: string): Promise<void> {
  if (!content.trim()) {
    return;
  }

  const comment: Comment = {
    id: crypto.randomUUID(),
    highlightId,
    userId: currentUser?.id,
    content: content.trim(),
    mentions: extractMentions(content),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Optimistic update
  const existing = comments.get(highlightId) || [];
  existing.push(comment);
  comments.set(highlightId, existing);

  if (activeTab === 'highlights') {
    renderHighlights();
  }

  // Send to backend
  chrome.runtime.sendMessage({
    type: 'CREATE_COMMENT',
    timestamp: Date.now(),
    payload: { highlightId, content: comment.content, mentions: comment.mentions },
  });
}

function extractMentions(text: string): string[] {
  const mentions: string[] = [];
  const regex = /@(\w+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Chat
async function loadChat(): Promise<void> {
  chatMessages.innerHTML =
    '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-title">No messages yet</div><div class="empty-state-desc">Start a conversation about this page</div></div>';
}

async function sendChatMessage(): Promise<void> {
  const content = chatInput.value.trim();
  if (!content) {
    return;
  }

  chatInput.value = '';

  // Would send to backend via Realtime
  console.log('Send chat:', content);
}

// Feed
async function loadFeed(): Promise<void> {
  feedList.innerHTML =
    '<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-title">Team activity</div><div class="empty-state-desc">Recent visits and highlights from your team</div></div>';
}

// Search
function loadSearchFilters(): void {
  searchFilters.innerHTML = `
    <button class="filter-chip" data-filter="type:highlight">Highlights</button>
    <button class="filter-chip" data-filter="type:visit">Visits</button>
    <button class="filter-chip" data-filter="type:comment">Comments</button>
    <button class="filter-chip" data-filter="type:note">Notes</button>
    <button class="filter-chip" data-filter="hasComments:true">With comments</button>
  `;

  searchFilters.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      handleSearch();
    });
  });
}

async function handleSearch(): Promise<void> {
  const query = searchInput.value.trim();
  const activeFilters = Array.from(searchFilters.querySelectorAll('.filter-chip.active')).map(
    (c) => c.dataset.filter
  );

  if (!query && activeFilters.length === 0) {
    searchResults.innerHTML = '';
    return;
  }

  searchResults.innerHTML = '<div class="loading"><div class="spinner"></div>Searching...</div>';

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'SEARCH_QUERY',
        timestamp: Date.now(),
        payload: { query, filters: parseFilters(activeFilters) },
      },
      (response) => {
        const results = response?.payload?.results || [];
        renderSearchResults(results);
        resolve();
      }
    );
  });
}

function parseFilters(filters: string[]): any {
  const result: any = {};
  filters.forEach((f) => {
    const [key, value] = f.split(':');
    if (key === 'type') {
      result.contentType = value;
    } else if (key === 'hasComments') {
      result.hasComments = value === 'true';
    }
  });
  return result;
}

function renderSearchResults(results: any[]): void {
  if (results.length === 0) {
    searchResults.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No results</div><div class="empty-state-desc">Try different search terms or filters</div></div>';
    return;
  }

  searchResults.innerHTML = results
    .map(
      (r) => `
    <div class="search-result" data-id="${r.id}" data-type="${r.type}">
      <div class="result-header">
        <span class="result-type ${r.type}">${r.type}</span>
        <span class="result-title">${escapeHtml(r.title)}</span>
      </div>
      ${r.snippet ? `<div class="result-snippet">${escapeHtml(r.snippet)}</div>` : ''}
      <div class="result-meta">
        <span>${r.domain}</span>
        <span>${formatRelativeTime(r.timestamp)}</span>
        <span style="color:${r.userColor}">${r.userName}</span>
      </div>
    </div>
  `
    )
    .join('');

  searchResults.querySelectorAll('.search-result').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const type = el.dataset.type;
      openSearchResult(id, type);
    });
  });
}

function openSearchResult(id: string, type: string): void {
  // Navigate to the result
  console.log('Open result:', id, type);
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Initialize
document.addEventListener('DOMContentLoaded', initialize);
