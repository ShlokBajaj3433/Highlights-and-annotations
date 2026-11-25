/** Chrome storage utilities with type safety */

import type { DomainShareRule, User, Workspace, WorkspaceSettings } from './types';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  CURRENT_WORKSPACE: 'current_workspace',
  WORKSPACES: 'workspaces',
  DOMAIN_RULES: 'domain_rules',
  PAUSE_STATE: 'pause_state',
  SETTINGS: 'settings',
  OFFLINE_QUEUE: 'offline_queue',
  LAST_SYNC: 'last_sync',
} as const;

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
  return result[STORAGE_KEYS.AUTH_TOKEN] || null;
}

export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
}

export async function getRefreshToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.REFRESH_TOKEN);
  return result[STORAGE_KEYS.REFRESH_TOKEN] || null;
}

export async function setRefreshToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.REFRESH_TOKEN]: token });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.CURRENT_WORKSPACE,
    STORAGE_KEYS.WORKSPACES,
  ]);
}

export async function getUser(): Promise<User | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
  return result[STORAGE_KEYS.USER] || null;
}

export async function setUser(user: User): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.USER]: user });
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_WORKSPACE);
  return result[STORAGE_KEYS.CURRENT_WORKSPACE] || null;
}

export async function setCurrentWorkspaceId(workspaceId: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_WORKSPACE]: workspaceId });
}

export async function getWorkspaces(): Promise<Record<string, Workspace>> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.WORKSPACES);
  return result[STORAGE_KEYS.WORKSPACES] || {};
}

export async function setWorkspaces(workspaces: Record<string, Workspace>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.WORKSPACES]: workspaces });
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const workspaces = await getWorkspaces();
  return workspaces[workspaceId] || null;
}

export async function setWorkspace(workspace: Workspace): Promise<void> {
  const workspaces = await getWorkspaces();
  workspaces[workspace.id] = workspace;
  await setWorkspaces(workspaces);
}

export async function removeWorkspace(workspaceId: string): Promise<void> {
  const workspaces = await getWorkspaces();
  delete workspaces[workspaceId];
  await setWorkspaces(workspaces);
}

export async function getDomainRules(): Promise<DomainShareRule[]> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.DOMAIN_RULES);
  return result[STORAGE_KEYS.DOMAIN_RULES] || [];
}

export async function setDomainRules(rules: DomainShareRule[]): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEYS.DOMAIN_RULES]: rules });
}

export async function getPauseState(): Promise<{ paused: boolean; pauseUntil?: number }> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PAUSE_STATE);
  return result[STORAGE_KEYS.PAUSE_STATE] || { paused: false };
}

export async function setPauseState(paused: boolean, pauseUntil?: number): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.PAUSE_STATE]: { paused, pauseUntil },
  });
}

export async function getSettings(): Promise<WorkspaceSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  return (
    result[STORAGE_KEYS.SETTINGS] || {
      defaultShareLevel: 'hidden',
      blockedDomains: [],
      maxRoomSize: 20,
      digestEnabled: false,
      digestTime: '09:00',
      heatmapEnabled: false,
    }
  );
}

export async function setSettings(settings: WorkspaceSettings): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

export async function getOfflineQueue(): Promise<unknown[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.OFFLINE_QUEUE);
  return result[STORAGE_KEYS.OFFLINE_QUEUE] || [];
}

export async function addToOfflineQueue(item: unknown): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push({ ...item, timestamp: Date.now() });
  await chrome.storage.local.set({ [STORAGE_KEYS.OFFLINE_QUEUE]: queue });
}

export async function clearOfflineQueue(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.OFFLINE_QUEUE);
}

export async function getLastSync(): Promise<number> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC);
  return result[STORAGE_KEYS.LAST_SYNC] || 0;
}

export async function setLastSync(timestamp: number): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: timestamp });
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
  await chrome.storage.sync.clear();
}
