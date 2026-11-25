/** Background service worker - handles auth, alarms, context menus, message routing */

import { deterministicColor, generateInviteCode, generateWorkspaceSecret } from '@shared/crypto';
import type { ExtensionMessage } from '@shared/messages';
import {
  addToOfflineQueue,
  clearAuth,
  getAuthToken,
  getCurrentWorkspaceId,
  getDomainRules,
  getOfflineQueue,
  getPauseState,
  getUser,
  getWorkspaces,
  setAuthToken,
  setCurrentWorkspaceId,
  setDomainRules,
  setPauseState,
  setRefreshToken,
  setUser,
  setWorkspace,
} from '@shared/storage';
import {
  getWorkspacesForUser,
  recordVisitsBatch,
  createWorkspace as supabaseCreateWorkspace,
  getDomainRules as supabaseGetDomainRules,
  joinWorkspace as supabaseJoinWorkspace,
  signInWithGoogle as supabaseSignInWithGoogle,
  upsertDomainRule,
} from '@shared/supabase';
import type {
  DomainShareRule,
  PageVisit,
  ShareLevel,
  User,
  UserRole,
  Workspace,
} from '@shared/types';
import { extractDomain, getPageKey, getShareLevelForUrl, normalizeUrl } from '@shared/url';

// Offscreen document management
let offscreenDocumentCreated = false;
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

async function ensureOffscreenDocument(): Promise<void> {
  if (offscreenDocumentCreated) return;

  const existing = await chrome.offscreen.hasDocument();
  if (existing) {
    offscreenDocumentCreated = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['DOM_SCRAPING', 'WORKERS'],
    justification:
      'Maintain persistent Realtime connection for presence and collaborative features',
  });

  offscreenDocumentCreated = true;
}

async function closeOffscreenDocument(): Promise<void> {
  if (!offscreenDocumentCreated) return;

  const existing = await chrome.offscreen.hasDocument();
  if (existing) {
    await chrome.offscreen.closeDocument();
  }

  offscreenDocumentCreated = false;
}

// Message routing
async function routeMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<void> {
  const realtimeMessages = [
    'PRESENCE_UPDATE',
    'HIGHLIGHT_CREATED',
    'HIGHLIGHT_UPDATED',
    'HIGHLIGHT_DELETED',
    'COMMENT_CREATED',
    'COMMENT_UPDATED',
    'COMMENT_DELETED',
    'REALTIME_CONNECT',
    'REALTIME_DISCONNECT',
    'SYNC_REQUEST',
    'SEARCH_QUERY',
  ];

  if (realtimeMessages.includes(message.type)) {
    await ensureOffscreenDocument();
    chrome.runtime.sendMessage(message);
    return;
  }

  switch (message.type) {
    case 'AUTH_STATE_CHANGED':
      await handleAuthStateChange(message.payload);
      break;
    case 'WORKSPACE_CHANGED':
      await handleWorkspaceChange(message.payload);
      break;
    case 'VISIT_RECORDED':
      await handleVisitRecorded(message.payload);
      break;
    case 'DOMAIN_RULE_CHANGED':
      await handleDomainRuleChange(message.payload);
      break;
    case 'PAUSE_STATE_CHANGED':
      await handlePauseStateChange(message.payload);
      break;
    case 'GET_PAGE_INFO':
      await handleGetPageInfo(message.payload, sender);
      break;
    case 'CREATE_HIGHLIGHT':
      await handleCreateHighlight(message.payload);
      break;
    case 'OFFLINE_QUEUE_FLUSH':
      await flushOfflineQueue();
      break;
    case 'GOOGLE_AUTH':
      await handleGoogleAuth();
      break;
    case 'CREATE_WORKSPACE':
      await handleCreateWorkspace(message.payload);
      break;
    case 'JOIN_WORKSPACE':
      await handleJoinWorkspace(message.payload);
      break;
    case 'SWITCH_WORKSPACE':
      await handleSwitchWorkspace(message.payload);
      break;
    case 'REVOKE_INVITE':
      await handleRevokeInvite(message.payload);
      break;
    case 'REGENERATE_INVITE':
      await handleRegenerateInvite(message.payload);
      break;
    case 'TRANSFER_OWNERSHIP':
      await handleTransferOwnership(message.payload);
      break;
    case 'REMOVE_MEMBER':
      await handleRemoveMember(message.payload);
      break;
    case 'CHANGE_MEMBER_ROLE':
      await handleChangeMemberRole(message.payload);
      break;
    case 'DELETE_WORKSPACE':
      await handleDeleteWorkspace(message.payload);
      break;
    case 'LEAVE_WORKSPACE':
      await handleLeaveWorkspace(message.payload);
      break;
  }
}

async function handleAuthStateChange(payload: {
  isAuthenticated: boolean;
  user?: User;
  workspace?: Workspace;
}): Promise<void> {
  if (!payload.isAuthenticated) {
    await clearAuth();
    await closeOffscreenDocument();
  } else if (payload.user && payload.workspace) {
    await setUser(payload.user);
    await setWorkspaces({ [payload.workspace.id]: payload.workspace });
    await setCurrentWorkspaceId(payload.workspace.id);
    await ensureOffscreenDocument();
  }
}

async function handleWorkspaceChange(payload: { workspace: Workspace | null }): Promise<void> {
  if (payload.workspace) {
    await setWorkspace(payload.workspace);
    await setCurrentWorkspaceId(payload.workspace.id);
  }
}

async function handleVisitRecorded(payload: { visit: PageVisit }): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return;

  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  if (!workspace) return;

  await addToOfflineQueue({
    type: 'visit',
    workspaceId,
    data: payload.visit,
  });
}

async function handleDomainRuleChange(payload: {
  domain: string;
  level: ShareLevel;
  isBlocklist: boolean;
}): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return;

  const rule: DomainShareRule = {
    domain: payload.domain,
    level: payload.level,
    isBlocklist: payload.isBlocklist,
  };

  // Update local storage
  const rules = await getDomainRules();
  const existingIndex = rules.findIndex((r) => r.domain === payload.domain);
  if (existingIndex >= 0) {
    rules[existingIndex] = rule;
  } else {
    rules.push(rule);
  }
  await setDomainRules(rules);

  // Sync to backend
  try {
    await upsertDomainRule(workspaceId, rule);
  } catch (error) {
    console.error('Failed to sync domain rule:', error);
    // Queue for retry
    await addToOfflineQueue({
      type: 'domain_rule',
      workspaceId,
      data: rule,
    });
  }
}

async function handlePauseStateChange(payload: {
  paused: boolean;
  pauseUntil?: number;
}): Promise<void> {
  await setPauseState(payload.paused, payload.pauseUntil);

  if (!payload.paused) {
    await ensureOffscreenDocument();
    await flushOfflineQueue();
  } else {
    await closeOffscreenDocument();
  }
}

async function handleGetPageInfo(
  payload: { tabId: number },
  sender: chrome.runtime.MessageSender
): Promise<void> {
  try {
    const tab = await chrome.tabs.get(payload.tabId);
    if (!tab.url) return;

    const domain = extractDomain(tab.url);
    const workspaceId = await getCurrentWorkspaceId();

    let shareLevel: ShareLevel = 'hidden';
    let pageKey = '';

    if (workspaceId) {
      const workspaces = await getWorkspaces();
      const workspace = workspaces[workspaceId];

      if (workspace) {
        const rules = await getDomainRules();
        const settings = workspace.settings;
        shareLevel = getShareLevelForUrl(
          tab.url,
          rules,
          settings.defaultShareLevel,
          settings.blockedDomains
        );

        if (shareLevel !== 'hidden') {
          const normalized = normalizeUrl(tab.url, domain);
          pageKey = await getPageKey(normalized, workspace.hmacSecret);
        }
      }
    }

    const response: ExtensionMessage = {
      type: 'PAGE_INFO_RESPONSE',
      timestamp: Date.now(),
      requestId: '',
      payload: {
        url: tab.url,
        title: tab.title || '',
        domain,
        canonicalUrl: tab.url,
        pageKey,
        shareLevel,
      },
    };

    chrome.tabs.sendMessage(payload.tabId, response);
  } catch (error) {
    console.error('Get page info failed:', error);
  }
}

async function handleCreateHighlight(payload: {
  pageKey: string;
  quote: { exact: string; prefix: string; suffix: string };
  position: { start: number; end: number };
  xpath: string;
  color: string;
}): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const user = await getUser();

  if (!workspaceId || !user) return;

  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  if (!workspace) return;

  const pauseState = await getPauseState();
  if (pauseState.paused) return;

  await addToOfflineQueue({
    type: 'highlight',
    workspaceId,
    data: {
      ...payload,
      workspaceId,
      userId: user.id,
      color: user.color,
    },
  });
}

async function flushOfflineQueue(): Promise<void> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return;

  const visits = queue.filter((item) => item.type === 'visit').map((item) => item.data);

  if (visits.length > 0) {
    const workspaceId = await getCurrentWorkspaceId();
    if (workspaceId) {
      try {
        await recordVisitsBatch(visits);
        // Remove synced items from queue
        const remaining = queue.filter((item) => item.type !== 'visit');
        await chrome.storage.local.set({ offline_queue: remaining });
      } catch (error) {
        console.error('Failed to flush visits:', error);
      }
    }
  }

  // Other item types (highlights, comments, domain_rules) would be synced via Realtime
}

async function handleGoogleAuth(): Promise<void> {
  try {
    const authData = await supabaseSignInWithGoogle();

    if (!authData) throw new Error('No auth data returned');

    const { access_token, refresh_token, user } = authData;

    await setAuthToken(access_token);
    await setRefreshToken(refresh_token);

    // Create user object
    const userObj: User = {
      id: user.id,
      googleId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email.split('@')[0],
      avatarUrl: user.user_metadata?.avatar_url || '',
      color: deterministicColor(user.id),
      role: 'member',
      workspaces: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    await setUser(userObj);

    // Fetch user's workspaces
    const workspaces = await getWorkspacesForUser(user.id);
    const workspacesMap: Record<string, Workspace> = {};
    for (const ws of workspaces) {
      workspacesMap[ws.id] = ws;
    }
    await setWorkspaces(workspacesMap);

    if (workspaces.length > 0) {
      await setCurrentWorkspaceId(workspaces[0].id);
    }

    await ensureOffscreenDocument();

    // Notify UI
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      timestamp: Date.now(),
      payload: { isAuthenticated: true, user: userObj, workspace: workspaces[0] || null },
    });
  } catch (error) {
    console.error('Google auth failed:', error);
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      timestamp: Date.now(),
      payload: {
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Auth failed',
      },
    });
  }
}

async function handleCreateWorkspace(payload: { name: string }): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const hmacSecret = await generateWorkspaceSecret();
  const workspace = await supabaseCreateWorkspace(payload.name, user.id, hmacSecret);

  if (!workspace) throw new Error('Failed to create workspace');

  await setWorkspace(workspace);
  await setCurrentWorkspaceId(workspace.id);

  // Update user's workspace list
  const workspaces = await getWorkspaces();
  workspaces[workspace.id] = workspace;
  await setWorkspaces(workspaces);

  chrome.runtime.sendMessage({
    type: 'WORKSPACE_CHANGED',
    timestamp: Date.now(),
    payload: { workspace },
  });
}

async function handleJoinWorkspace(payload: { inviteCode: string }): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const workspace = await supabaseJoinWorkspace(payload.inviteCode, user.id);

  if (!workspace) throw new Error('Failed to join workspace');

  await setWorkspace(workspace);
  await setCurrentWorkspaceId(workspace.id);

  const workspaces = await getWorkspaces();
  workspaces[workspace.id] = workspace;
  await setWorkspaces(workspaces);

  chrome.runtime.sendMessage({
    type: 'WORKSPACE_CHANGED',
    timestamp: Date.now(),
    payload: { workspace },
  });
}

async function handleSwitchWorkspace(payload: { workspaceId: string }): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];

  if (!workspace) throw new Error('Workspace not found');

  await setCurrentWorkspaceId(workspaceId);
  await ensureOffscreenDocument();

  chrome.runtime.sendMessage({
    type: 'WORKSPACE_CHANGED',
    timestamp: Date.now(),
    payload: { workspace },
  });
}

async function handleRevokeInvite(payload: { workspaceId: string }): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];

  if (!workspace) throw new Error('Workspace not found');
  if (workspace.ownerId !== (await getUser())?.id) throw new Error('Only owner can revoke invite');

  // In production, call backend to revoke
  workspace.inviteRevoked = true;
  await setWorkspace(workspace);
}

async function handleRegenerateInvite(payload: { workspaceId: string }): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];

  if (!workspace) throw new Error('Workspace not found');
  if (workspace.ownerId !== (await getUser())?.id && workspace.role !== 'admin') {
    throw new Error('Only owner or admin can regenerate invite');
  }

  const newInviteCode = await generateInviteCode();
  workspace.inviteCode = newInviteCode;
  workspace.inviteExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  workspace.inviteRevoked = false;
  await setWorkspace(workspace);
}

async function handleTransferOwnership(payload: {
  workspaceId: string;
  newOwnerId: string;
}): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  const user = await getUser();

  if (!workspace) throw new Error('Workspace not found');
  if (workspace.ownerId !== user?.id) throw new Error('Only owner can transfer ownership');

  workspace.ownerId = payload.newOwnerId;
  // In production, call backend to update
  await setWorkspace(workspace);
}

async function handleRemoveMember(payload: { workspaceId: string; userId: string }): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  const user = await getUser();

  if (!workspace) throw new Error('Workspace not found');
  const requesterRole = workspace.ownerId === user?.id ? 'owner' : 'member';
  if (requesterRole !== 'owner' && requesterRole !== 'admin') {
    throw new Error('Only owner or admin can remove members');
  }

  // In production, call backend to remove member
  // For now, just update local state if it's the current user
  if (payload.userId === user?.id) {
    await clearAuth();
  }
}

async function handleChangeMemberRole(payload: {
  workspaceId: string;
  userId: string;
  role: UserRole;
}): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  const user = await getUser();

  if (!workspace) throw new Error('Workspace not found');
  if (workspace.ownerId !== user?.id) throw new Error('Only owner can change roles');

  // In production, call backend
}

async function handleDeleteWorkspace(payload: { workspaceId: string }): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  const user = await getUser();

  if (!workspace) throw new Error('Workspace not found');
  if (workspace.ownerId !== user?.id) throw new Error('Only owner can delete workspace');

  // In production, call backend to delete
  await removeWorkspace(workspaceId);

  // If this was current workspace, clear auth
  const currentWsId = await getCurrentWorkspaceId();
  if (currentWsId === workspaceId) {
    await clearAuth();
  }
}

async function handleLeaveWorkspace(payload: { workspaceId: string }): Promise<void> {
  const workspaceId = payload.workspaceId;
  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  const user = await getUser();

  if (!workspace) throw new Error('Workspace not found');
  if (workspace.ownerId === user?.id)
    throw new Error('Owner cannot leave, must transfer ownership first');

  // In production, call backend to remove member
  await removeWorkspace(workspaceId);

  const currentWsId = await getCurrentWorkspaceId();
  if (currentWsId === workspaceId) {
    const remainingWorkspaces = await getWorkspaces();
    const firstWorkspaceId = Object.keys(remainingWorkspaces)[0];
    if (firstWorkspaceId) {
      await setCurrentWorkspaceId(firstWorkspaceId);
    } else {
      await clearAuth();
    }
  }
}

// Initialize alarms
function setupAlarms(): void {
  chrome.alarms.create('daily-cleanup', { periodInMinutes: 60 * 24 });
  chrome.alarms.create('daily-digest', { when: getNextDigestTime(), periodInMinutes: 60 * 24 });
  chrome.alarms.create('flush-queue', { periodInMinutes: 5 });
  chrome.alarms.create('heartbeat', { periodInMinutes: 1 / 3 });
  chrome.alarms.create('sync-domain-rules', { periodInMinutes: 60 });
}

function getNextDigestTime(): number {
  const now = new Date();
  const digest = new Date(now);
  digest.setHours(9, 0, 0, 0);
  if (digest <= now) digest.setDate(digest.getDate() + 1);
  return digest.getTime();
}

async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  switch (alarm.name) {
    case 'daily-cleanup':
      await performDailyCleanup();
      break;
    case 'daily-digest':
      await sendDailyDigest();
      break;
    case 'flush-queue':
      await flushOfflineQueue();
      break;
    case 'heartbeat':
      await sendHeartbeat();
      break;
    case 'sync-domain-rules':
      await syncDomainRules();
      break;
  }
}

async function performDailyCleanup(): Promise<void> {
  console.log('Daily cleanup triggered');
}

async function sendDailyDigest(): Promise<void> {
  console.log('Daily digest triggered');
}

async function sendHeartbeat(): Promise<void> {
  const existing = await chrome.offscreen.hasDocument();
  if (existing) {
    chrome.runtime.sendMessage({
      type: 'REALTIME_STATUS',
      timestamp: Date.now(),
      payload: { status: 'connected' },
    });
  }
}

async function syncDomainRules(): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return;

  try {
    const rules = await supabaseGetDomainRules(workspaceId);
    await setDomainRules(rules);
  } catch (error) {
    console.error('Failed to sync domain rules:', error);
  }
}

// Context menus
function setupContextMenus(): void {
  chrome.contextMenus.create({
    id: 'highlight-for-team',
    title: 'Highlight for team',
    contexts: ['selection'],
    documentUrlPatterns: ['<all_urls>'],
  });

  chrome.contextMenus.create({
    id: 'copy-highlight-link',
    title: 'Copy highlight link',
    contexts: ['selection'],
    documentUrlPatterns: ['<all_urls>'],
  });

  chrome.contextMenus.create({
    id: 'new-page-note',
    title: 'Add page note',
    contexts: ['page'],
    documentUrlPatterns: ['<all_urls>'],
  });
}

async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const user = await getUser();

  if (!workspaceId || !user) return;

  const workspaces = await getWorkspaces();
  const workspace = workspaces[workspaceId];
  if (!workspace) return;

  const pauseState = await getPauseState();
  if (pauseState.paused) return;

  switch (info.menuItemId) {
    case 'highlight-for-team':
      if (info.selectionText && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'HIGHLIGHT_TEXT',
          timestamp: Date.now(),
          payload: {
            quote: { exact: info.selectionText, prefix: '', suffix: '' },
            position: { start: 0, end: 0 },
            xpath: '',
          },
        });
      }
      break;
    case 'new-page-note':
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NEW_PAGE_NOTE',
          timestamp: Date.now(),
          payload: { url: tab.url },
        });
      }
      break;
  }
}

// Initialize
async function initialize(): Promise<void> {
  setupAlarms();
  setupContextMenus();

  const token = await getAuthToken();
  const user = await getUser();

  if (token && user) {
    await ensureOffscreenDocument();
  }

  console.log('Copage background initialized');
}

// Event listeners
chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  routeMessage(message, sender);
  return true;
});
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  sendResponse({ received: true });
  return true;
});

// Export for testing
export { initialize, handleGoogleAuth, handleCreateWorkspace, handleJoinWorkspace };
