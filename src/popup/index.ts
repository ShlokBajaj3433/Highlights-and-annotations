/** Popup UI logic */

import {
  getAuthToken,
  getCurrentWorkspaceId,
  getDomainRules,
  getPauseState,
  getUser,
  getWorkspaces,
  setCurrentWorkspaceId,
  setPauseState,
} from '@shared/storage';
import type { ShareLevel, User, Workspace } from '@shared/types';

// State
let currentUser: User | null = null;
let currentWorkspaceId: string | null = null;
let workspaces: Record<string, Workspace> = {};
let isPaused = false;
let pauseUntil: number | null = null;

// Elements
const workspaceSelect = document.getElementById('workspaceSelect') as HTMLSelectElement;
const statusDot = document.getElementById('statusDot') as HTMLSpanElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;
const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
const presenceCount = document.getElementById('presenceCount') as HTMLSpanElement;
const presenceAvatars = document.getElementById('presenceAvatars') as HTMLDivElement;
const feed = document.getElementById('feed') as HTMLDivElement;
const openSidePanelBtn = document.getElementById('openSidePanelBtn') as HTMLButtonElement;
const viewFeedBtn = document.getElementById('viewFeedBtn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;

// Initialize
async function initialize(): Promise<void> {
  await loadState();
  setupEventListeners();
  render();

  // Listen for updates
  chrome.runtime.onMessage.addListener(handleMessage);
}

async function loadState(): Promise<void> {
  const [token, user, workspaceId, ws, _rules, pauseState] = await Promise.all([
    getAuthToken(),
    getUser(),
    getCurrentWorkspaceId(),
    getWorkspaces(),
    getDomainRules(),
    getPauseState(),
  ]);

  if (!token || !user) {
    // Not authenticated - show sign in
    showAuthRequired();
    return;
  }

  currentUser = user;
  currentWorkspaceId = workspaceId;
  workspaces = ws;
  isPaused = pauseState.paused;
  pauseUntil = pauseState.pauseUntil || null;

  // Load workspaces from backend if needed
  if (Object.keys(workspaces).length === 0) {
    await refreshWorkspaces();
  }
}

function showAuthRequired(): void {
  statusText.textContent = 'Sign in required';
  statusDot.className = 'status-dot';
  pauseBtn.style.display = 'none';
  presenceCount.textContent = '0';
  feed.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🔐</div>
      <div>Sign in to start collaborating</div>
      <button class="action-btn primary" id="signInBtn" style="margin-top: 12px; width: 100%;">Sign in with Google</button>
    </div>
  `;
  document.getElementById('signInBtn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GOOGLE_AUTH', timestamp: Date.now() });
  });
}

async function refreshWorkspaces(): Promise<void> {
  // Would fetch from backend
  // For now, use local storage
}

function setupEventListeners(): void {
  workspaceSelect.addEventListener('change', handleWorkspaceChange);
  pauseBtn.addEventListener('click', handlePauseToggle);
  openSidePanelBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', timestamp: Date.now() });
    window.close();
  });
  viewFeedBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_FEED', timestamp: Date.now() });
    window.close();
  });
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

async function handleWorkspaceChange(): Promise<void> {
  const workspaceId = workspaceSelect.value;
  if (workspaceId) {
    await setCurrentWorkspaceId(workspaceId);
    currentWorkspaceId = workspaceId;
    render();
  }
}

async function handlePauseToggle(): Promise<void> {
  if (isPaused) {
    await setPauseState(false);
    isPaused = false;
    pauseUntil = null;
  } else {
    // Show pause options
    const options = [
      { label: '1 hour', ms: 60 * 60 * 1000 },
      { label: 'Until tomorrow', ms: getMsUntilTomorrow() },
      { label: 'Indefinitely', ms: null },
    ];

    const choice = await showPauseOptions(options);
    if (choice) {
      await setPauseState(true, choice.ms ? Date.now() + choice.ms : undefined);
      isPaused = true;
      pauseUntil = choice.ms ? Date.now() + choice.ms : null;
    }
  }
  render();
}

function getMsUntilTomorrow(): number {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - Date.now();
}

function showPauseOptions(
  options: Array<{ label: string; ms: number | null }>
): Promise<{ label: string; ms: number | null } | null> {
  return new Promise((resolve) => {
    const menu = document.createElement('div');
    menu.style.cssText = `
      position: fixed; bottom: 60px; right: 8px; background: white; border: 1px solid #ddd;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; min-width: 180px;
    `;
    menu.innerHTML = options
      .map(
        (opt, index) => `
      <button data-ms="${opt.ms}" style="width:100%;padding:10px 12px;text-align:left;border:none;background:none;cursor:pointer;font-size:13px;color:#1a1a2e;${index === options.length - 1 ? '' : 'border-bottom:1px solid #f0f0f0;'}">${opt.label}</button>
    `
      )
      .join('');

    document.body.appendChild(menu);

    const handleClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (btn) {
        const ms = btn.dataset.ms === 'null' ? null : Number.parseInt(btn.dataset.ms || '0');
        const label = btn.textContent || '';
        cleanup();
        resolve({ label, ms: ms || null });
      }
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        cleanup();
        resolve(null);
      }
    };

    const cleanup = () => {
      menu.removeEventListener('click', handleClick);
      document.removeEventListener('click', handleOutsideClick);
      menu.remove();
    };

    menu.addEventListener('click', handleClick);
    setTimeout(() => document.addEventListener('click', handleOutsideClick), 0);
  });
}

function handleMessage(message: any): void {
  switch (message.type) {
    case 'AUTH_STATE_CHANGED':
      if (!message.payload.isAuthenticated) {
        showAuthRequired();
      } else {
        loadState().then(render);
      }
      break;
    case 'WORKSPACE_CHANGED':
      loadState().then(render);
      break;
    case 'PRESENCE_UPDATE':
      renderPresence(message.payload);
      break;
    case 'PAUSE_STATE_CHANGED':
      isPaused = message.payload.paused;
      pauseUntil = message.payload.pauseUntil;
      render();
      break;
  }
}

function render(): void {
  renderWorkspaceSelect();
  renderStatus();
  renderPresence({ users: [], pageKey: '' });
  renderFeed();
}

function renderWorkspaceSelect(): void {
  workspaceSelect.innerHTML = '';

  Object.values(workspaces).forEach((ws) => {
    const option = document.createElement('option');
    option.value = ws.id;
    option.textContent = ws.name;
    option.selected = ws.id === currentWorkspaceId;
    workspaceSelect.appendChild(option);
  });

  if (Object.keys(workspaces).length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No workspaces';
    option.disabled = true;
    option.selected = true;
    workspaceSelect.appendChild(option);
  }
}

function renderStatus(): void {
  if (!currentUser) {
    return;
  }

  if (isPaused) {
    statusDot.className = 'status-dot paused';
    const timeLeft = pauseUntil ? pauseUntil - Date.now() : null;
    if (timeLeft && timeLeft > 0) {
      const hours = Math.ceil(timeLeft / (1000 * 60 * 60));
      statusText.textContent = `Paused (${hours}h left)`;
    } else {
      statusText.textContent = 'Paused';
    }
    pauseBtn.textContent = 'Resume';
  } else {
    statusDot.className = 'status-dot active';
    statusText.textContent = 'Sharing';
    pauseBtn.textContent = 'Pause';
  }
}

function renderPresence(payload: {
  users: Array<{ userId: string; userName: string; userColor: string; shareLevel: ShareLevel }>;
  pageKey: string;
}): void {
  const users = payload.users.filter((u) => u.userId !== currentUser?.id);
  presenceCount.textContent = users.length.toString();

  presenceAvatars.innerHTML = '';

  if (users.length === 0) {
    presenceAvatars.innerHTML = '<span style="color:#999;font-size:12px;">Just you</span>';
    return;
  }

  users.slice(0, 4).forEach((user) => {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.background = user.userColor;
    avatar.textContent = user.userName.charAt(0).toUpperCase();
    avatar.title = user.userName;
    presenceAvatars.appendChild(avatar);
  });

  if (users.length > 4) {
    const more = document.createElement('div');
    more.className = 'avatar more';
    more.textContent = `+${users.length - 4}`;
    presenceAvatars.appendChild(more);
  }
}

function renderFeed(): void {
  // Would fetch from backend
  // For now, show placeholder
  feed.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📄</div>
      <div>Team activity appears here</div>
      <div style="font-size:11px;color:#ccc;margin-top:4px;">Visit pages to see teammates' activity</div>
    </div>
  `;
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

// Initialize
document.addEventListener('DOMContentLoaded', initialize);
