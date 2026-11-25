import { vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    onMessageExternal: {
      addListener: vi.fn(),
    },
    lastError: null,
    getManifest: vi.fn(() => ({ version: '0.1.0' })),
    getURL: vi.fn((path) => `chrome-extension://test/${path}`),
  },
  storage: {
    local: {
      get: vi.fn((keys) => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    },
    sync: {
      get: vi.fn((keys) => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    },
  },
  identity: {
    getAuthToken: vi.fn((options, callback) => callback('mock-token')),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    get: vi.fn(() => Promise.resolve({ id: 1, url: 'https://example.com', title: 'Test' })),
    sendMessage: vi.fn(),
  },
  offscreen: {
    hasDocument: vi.fn(() => Promise.resolve(false)),
    createDocument: vi.fn(() => Promise.resolve()),
    closeDocument: vi.fn(() => Promise.resolve()),
  },
  sidePanel: {
    open: vi.fn(),
    setOptions: vi.fn(),
  },
  action: {
    setPopup: vi.fn(),
    setTitle: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  i18n: {
    getMessage: vi.fn((key) => key),
  },
} as any;

// Mock crypto for Node.js
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: vi.fn(),
      importKey: vi.fn(),
      sign: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  } as any;
}

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  close: vi.fn(),
  onmessage: null,
}));

// Mock URL
global.URL = URL;

// Mock TextEncoder/Decoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
