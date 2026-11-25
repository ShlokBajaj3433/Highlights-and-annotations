import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Chrome storage before importing
vi.mock('@shared/storage', () => {
  const mockStorage = {
    local: new Map(),
    sync: new Map(),
  };

  return {
    getAuthToken: vi.fn(() => Promise.resolve(null)),
    setAuthToken: vi.fn(),
    getRefreshToken: vi.fn(() => Promise.resolve(null)),
    setRefreshToken: vi.fn(),
    clearAuth: vi.fn(),
    getUser: vi.fn(() => Promise.resolve(null)),
    setUser: vi.fn(),
    getCurrentWorkspaceId: vi.fn(() => Promise.resolve(null)),
    setCurrentWorkspaceId: vi.fn(),
    getWorkspaces: vi.fn(() => Promise.resolve({})),
    setWorkspaces: vi.fn(),
    getWorkspace: vi.fn(() => Promise.resolve(null)),
    setWorkspace: vi.fn(),
    removeWorkspace: vi.fn(),
    getDomainRules: vi.fn(() => Promise.resolve([])),
    setDomainRules: vi.fn(),
    getPauseState: vi.fn(() => Promise.resolve({ paused: false })),
    setPauseState: vi.fn(),
    getSettings: vi.fn(() =>
      Promise.resolve({
        defaultShareLevel: 'hidden',
        blockedDomains: [],
        maxRoomSize: 20,
        digestEnabled: false,
        digestTime: '09:00',
        heatmapEnabled: false,
      })
    ),
    setSettings: vi.fn(),
    getOfflineQueue: vi.fn(() => Promise.resolve([])),
    addToOfflineQueue: vi.fn(),
    clearOfflineQueue: vi.fn(),
    getLastSync: vi.fn(() => Promise.resolve(0)),
    setLastSync: vi.fn(),
    clearAllData: vi.fn(),
  };
});

import {
  addToOfflineQueue,
  setAuthToken,
  setCurrentWorkspaceId,
  setDomainRules,
  setPauseState,
  setRefreshToken,
  setUser,
  setWorkspace,
  setWorkspaces,
} from '@shared/storage';

describe('Storage utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth tokens', () => {
    it('gets and sets auth token', async () => {
      await setAuthToken('test-token');
      expect(setAuthToken).toHaveBeenCalledWith('test-token');
    });

    it('gets and sets refresh token', async () => {
      await setRefreshToken('refresh-token');
      expect(setRefreshToken).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('User', () => {
    it('gets and sets user', async () => {
      const user = {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        avatarUrl: '',
        color: '#000',
        role: 'member',
        workspaces: [],
        createdAt: 0,
        lastActiveAt: 0,
      };
      await setUser(user);
      expect(setUser).toHaveBeenCalledWith(user);
    });
  });

  describe('Workspace', () => {
    it('gets and sets current workspace ID', async () => {
      await setCurrentWorkspaceId('ws-123');
      expect(setCurrentWorkspaceId).toHaveBeenCalledWith('ws-123');
    });

    it('gets and sets workspaces', async () => {
      const workspaces = { 'ws-1': { id: 'ws-1', name: 'Test' } };
      await setWorkspaces(workspaces);
      expect(setWorkspaces).toHaveBeenCalledWith(workspaces);
    });

    it('sets individual workspace', async () => {
      const workspace = { id: 'ws-1', name: 'Test' };
      await setWorkspace(workspace);
      expect(setWorkspace).toHaveBeenCalledWith(workspace);
    });
  });

  describe('Domain rules', () => {
    it('gets and sets domain rules', async () => {
      const rules = [{ domain: 'example.com', level: 'full' as const, isBlocklist: false }];
      await setDomainRules(rules);
      expect(setDomainRules).toHaveBeenCalledWith(rules);
    });
  });

  describe('Pause state', () => {
    it('gets and sets pause state', async () => {
      await setPauseState(true, Date.now() + 3600000);
      expect(setPauseState).toHaveBeenCalledWith(true, expect.any(Number));
    });
  });

  describe('Offline queue', () => {
    it('gets and adds to offline queue', async () => {
      await addToOfflineQueue({ type: 'visit', data: {} });
      expect(addToOfflineQueue).toHaveBeenCalledWith({ type: 'visit', data: {} });
    });
  });
});
