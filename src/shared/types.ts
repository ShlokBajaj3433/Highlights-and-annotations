/** Core type definitions for Copage extension */

export type ShareLevel = 'hidden' | 'domain' | 'full';

export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
  color: string;
  role: UserRole;
  workspaces: WorkspaceMembership[];
  createdAt: number;
  lastActiveAt: number;
}

export interface WorkspaceMembership {
  workspaceId: string;
  role: UserRole;
  joinedAt: number;
  shareLevelOverrides: DomainShareRule[];
}

export interface DomainShareRule {
  domain: string;
  level: ShareLevel;
  isBlocklist: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  inviteExpiresAt: number;
  inviteRevoked: boolean;
  hmacSecret: string;
  createdAt: number;
  settings: WorkspaceSettings;
  deletedAt?: number;
}

export interface WorkspaceSettings {
  defaultShareLevel: ShareLevel;
  blockedDomains: string[];
  maxRoomSize: number;
  digestEnabled: boolean;
  digestTime: string;
  heatmapEnabled: boolean;
}

export interface PageVisit {
  id: string;
  workspaceId: string;
  userId: string;
  pageKey: string;
  url?: string;
  title?: string;
  domain: string;
  shareLevel: ShareLevel;
  timestamp: number;
  dwellMs: number;
  metadata?: {
    canonicalUrl?: string;
    referrer?: string;
    isSpaNavigation?: boolean;
  };
}

export interface Highlight {
  id: string;
  workspaceId: string;
  pageKey: string;
  userId: string;
  color: string;
  quote: {
    exact: string;
    prefix: string;
    suffix: string;
  };
  position: { start: number; end: number };
  xpath: string;
  commentCount: number;
  isOrphaned: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Comment {
  id: string;
  highlightId: string;
  userId: string;
  content: string;
  parentId?: string;
  mentions: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface PageNote {
  id: string;
  workspaceId: string;
  pageKey: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export type PresenceEventType = 'join' | 'leave' | 'focus' | 'blur' | 'cursor' | 'scroll';

export interface PresenceEvent {
  type: PresenceEventType;
  workspaceId: string;
  pageKey: string;
  userId: string;
  userName: string;
  userColor: string;
  shareLevel: ShareLevel;
  data?: {
    cursorX?: number;
    cursorY?: number;
    scrollY?: number;
    viewportHeight?: number;
    timestamp: number;
  };
}

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: 'mention' | 'duplicate_visit' | 'digest' | 'invite' | 'role_change';
  payload: {
    highlightId?: string;
    commentId?: string;
    pageKey?: string;
    actorId?: string;
    message?: string;
  };
  read: boolean;
  createdAt: number;
}

export interface VisitConfig {
  minDwellMs: number;
  maxIdleMs: number;
  dedupeWindowMs: number;
  spaNavigationEvents: string[];
  sampleRate: number;
}
