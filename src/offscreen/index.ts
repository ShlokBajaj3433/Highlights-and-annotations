/** Offscreen document - maintains persistent Realtime connection for presence, highlights, chat */

import type { ExtensionMessage, PresenceEvent } from '@shared/messages';
import {
  clearOfflineQueue,
  getAuthToken,
  getCurrentWorkspaceId,
  getOfflineQueue,
  getWorkspaces,
} from '@shared/storage';

// Realtime connection state
let realtimeConnected = false;
const _realtimeChannel: any = null;
let broadcastChannel: BroadcastChannel | null = null;
let workspaceId: string | null = null;
let _hmacSecret = '';
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

// Initialize
async function initialize(): Promise<void> {
  console.log('Offscreen document initializing...');

  await loadWorkspaceConfig();
  setupMessageListener();
  await connectRealtime();
  startHeartbeat();

  console.log('Offscreen document ready');
}

async function loadWorkspaceConfig(): Promise<void> {
  const [wsId, ws] = await Promise.all([getCurrentWorkspaceId(), getWorkspaces()]);

  workspaceId = wsId;
  if (wsId && ws[wsId]) {
    _hmacSecret = ws[wsId].hmacSecret || '';
  }
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    handleMessage(message);
    return true;
  });
}

async function handleMessage(message: ExtensionMessage): Promise<void> {
  switch (message.type) {
    case 'WORKSPACE_CHANGED':
      await loadWorkspaceConfig();
      await reconnectRealtime();
      break;
    case 'REALTIME_CONNECT':
      await connectRealtime();
      break;
    case 'REALTIME_DISCONNECT':
      await disconnectRealtime();
      break;
    case 'PRESENCE_UPDATE':
      await sendPresenceEvent(message.payload);
      break;
    case 'HIGHLIGHT_CREATED':
    case 'HIGHLIGHT_UPDATED':
    case 'HIGHLIGHT_DELETED':
      await sendHighlightEvent(message.type, message.payload);
      break;
    case 'COMMENT_CREATED':
    case 'COMMENT_UPDATED':
    case 'COMMENT_DELETED':
      await sendCommentEvent(message.type, message.payload);
      break;
    case 'SYNC_REQUEST':
      await flushOfflineQueue();
      break;
    case 'SEARCH_QUERY':
      await handleSearch(message.payload);
      break;
  }
}

// Supabase Realtime connection
async function connectRealtime(): Promise<void> {
  if (!workspaceId || realtimeConnected) {
    return;
  }

  try {
    // In production, this would use @supabase/supabase-js
    // For now, simulate with BroadcastChannel for presence
    broadcastChannel = new BroadcastChannel(`copage-presence-${workspaceId}`);

    broadcastChannel.onmessage = (event) => {
      handleBroadcastMessage(event.data);
    };

    // Also connect to Supabase Realtime for highlights/comments
    // await supabaseRealtime.connect();

    realtimeConnected = true;
    reconnectAttempts = 0;
    broadcastStatus('connected');

    console.log('Realtime connected');
  } catch (error) {
    console.error('Realtime connection failed:', error);
    scheduleReconnect();
  }
}

async function disconnectRealtime(): Promise<void> {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  realtimeConnected = false;
  broadcastStatus('disconnected');
}

async function reconnectRealtime(): Promise<void> {
  await disconnectRealtime();
  await connectRealtime();
}

function scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnect attempts reached');
    broadcastStatus('disconnected', 'Max reconnection attempts reached');
    return;
  }

  const delay = RECONNECT_BASE_DELAY * 2 ** reconnectAttempts + Math.random() * 1000;
  reconnectAttempts++;

  console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  broadcastStatus('reconnecting');

  setTimeout(() => {
    connectRealtime();
  }, delay);
}

function broadcastStatus(
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting',
  error?: string
): void {
  chrome.runtime.sendMessage({
    type: 'REALTIME_STATUS',
    timestamp: Date.now(),
    payload: { status, error },
  });
}

function handleBroadcastMessage(data: PresenceEvent): void {
  // Forward presence updates to all contexts
  chrome.runtime.sendMessage({
    type: 'PRESENCE_UPDATE',
    timestamp: Date.now(),
    payload: {
      pageKey: data.pageKey,
      users: [
        {
          userId: data.userId,
          userName: data.userName,
          userColor: data.userColor,
          shareLevel: data.shareLevel,
        },
      ],
    },
  });
}

async function sendPresenceEvent(payload: any): Promise<void> {
  if (!broadcastChannel) {
    return;
  }

  const event: PresenceEvent = {
    type: payload.type,
    workspaceId: workspaceId!,
    pageKey: payload.pageKey,
    userId: payload.userId,
    userName: payload.userName,
    userColor: payload.userColor,
    shareLevel: payload.shareLevel,
    data: payload.data,
  };

  broadcastChannel.postMessage(event);
}

async function sendHighlightEvent(type: string, payload: any): Promise<void> {
  // Would send to Supabase Realtime (Postgres Changes)
  // For now, broadcast locally
  broadcastChannel?.postMessage({
    type: 'HIGHLIGHT_EVENT',
    eventType: type,
    payload,
    workspaceId,
  });
}

async function sendCommentEvent(type: string, payload: any): Promise<void> {
  // Would send to Supabase Realtime
  broadcastChannel?.postMessage({
    type: 'COMMENT_EVENT',
    eventType: type,
    payload,
    workspaceId,
  });
}

// Offline queue management
async function flushOfflineQueue(): Promise<void> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return;
  }

  console.log(`Flushing ${queue.length} offline items`);

  // Batch send to backend
  try {
    const token = await getAuthToken();
    const response = await fetch('https://your-backend.supabase.co/functions/v1/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: queue, workspaceId }),
    });

    if (response.ok) {
      await clearOfflineQueue();
      console.log('Offline queue flushed successfully');
    } else {
      console.error('Failed to flush offline queue');
    }
  } catch (error) {
    console.error('Offline queue flush error:', error);
  }
}

async function handleSearch(payload: any): Promise<void> {
  // Forward search to backend
  try {
    const token = await getAuthToken();
    const response = await fetch('https://your-backend.supabase.co/functions/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...payload, workspaceId }),
    });

    const results = await response.json();

    chrome.runtime.sendMessage({
      type: 'SEARCH_RESPONSE',
      timestamp: Date.now(),
      requestId: payload.requestId,
      payload: results,
    });
  } catch (error) {
    console.error('Search error:', error);
    chrome.runtime.sendMessage({
      type: 'SEARCH_RESPONSE',
      timestamp: Date.now(),
      requestId: payload.requestId,
      payload: { results: [], error: 'Search failed' },
    });
  }
}

// Heartbeat to keep connection alive
function startHeartbeat(): void {
  heartbeatInterval = setInterval(async () => {
    if (!realtimeConnected) {
      return;
    }

    try {
      // Ping the connection
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'HEARTBEAT', timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
      scheduleReconnect();
    }
  }, 20000); // Every 20 seconds
}

// Page visibility handling
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page became visible, ensure connection
    if (!realtimeConnected) {
      connectRealtime();
    }
  }
});

// Initialize
initialize();

// Handle unload
window.addEventListener('beforeunload', () => {
  disconnectRealtime();
});

export { initialize, connectRealtime, disconnectRealtime };
