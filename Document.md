# Product Requirements Document: Copage (Working Title)

**Version:** 1.1  
**Status:** Draft — incorporates architectural fixes from v1.0 review  
**Last Updated:** 2026-11-25  
**Author:** [Author Name]

---

## 1. Executive Summary

### 1.1 Product Vision
Copage is a browser extension that creates a **real-time presence and collaboration layer** on top of the open web. It enables teams to see when teammates are on the same page, share highlights and notes anchored to specific content, and build a collective research memory — all without leaving the browser.

### 1.2 Problem Statement
- **Link sharing is lossy:** Sending URLs loses context (what section mattered, what was highlighted, why it was relevant).
- **Screen sharing is heavy:** Requires scheduling, disrupts flow, and doesn't persist.
- **Team knowledge is fragmented:** Research trails live in private bookmarks, Slack threads, or Notion pages that no one maintains.
- **Duplicate work:** Multiple teammates read the same article independently, unaware of each other's notes.

### 1.3 Solution
A lightweight browser extension (Manifest V3) + real-time backend that provides:
1. **Presence awareness** — See who's on the current page in real-time
2. **Contextual annotations** — Highlight and comment on specific text, visible to teammates
3. **Shared research feed** — Team timeline of visits, highlights, and notes
4. **Privacy-first controls** — Granular per-domain sharing, incognito exclusion, pause/resume

### 1.4 Target Users
| Primary | Secondary |
|---------|-----------|
| Research teams (market, competitive, academic) | Journalists & content teams |
| Startup teams doing product discovery | Students & study groups |
| Distributed engineering teams reviewing docs/RFCs | Consultants & analysts |

---

## 2. Scope

### 2.1 In Scope (MVP — Phase 1)
- [ ] **Room/Workspace system** — Create/join teams via invite links with expiry, rate limiting, revocation
- [ ] **URL normalization & page identity** — Canonical URL detection, tracking param stripping (with per-domain allowlist), hash-based deduplication
- [ ] **Visit definition & feed** — Minimum dwell time (10s), active tab only, reload dedupe, SPA navigation via `pushState`/`replaceState`; chronological team activity log
- [ ] **Presence badge** — "N teammates on this page" indicator in extension popup; reciprocity rules for Hidden/Domain-only users
- [ ] **Privacy controls** — Per-domain sharing levels (Hidden / Domain-only / Full), default blocklist (PSL-based matching), pause button, activity log with delete
- [ ] **Authentication & roles** — Google OAuth; Owner/Admin/Member roles; remove member, leave, revoke/regenerate invite, transfer ownership, delete workspace
- [ ] **Anti-surveillance policy** — Admins can never see more than members chose to share; documented in onboarding and privacy policy

### 2.2 In Scope (Phase 2)
- [ ] **Shared highlights** — Text selection → highlight saved with quote/prefix/suffix/position/XPath anchoring
- [ ] **Highlight visibility** — Color-coded per user, rendered on-page via content script; blocked on Hidden domains (user warned)
- [ ] **Side panel (Chrome) / sidebar_action (Firefox)** — Unified UI for highlights, comments, chat, feed
- [ ] **Comments & threads** — `parentId` on Comment model for threaded replies; mentions notify teammates
- [ ] **Text fragment links** — Share `#:~:text=` deep links to highlighted passages
- [ ] **Search across team history** — Full-text search over visits, highlights, comments, page-level notes

### 2.3 In Scope (Phase 3)
- [ ] **Live cursors & scroll** — Real-time cursor/scroll position of teammates on same page (Broadcast/Presence channels)
- [ ] **Page chat** — URL-scoped chat in side panel
- [ ] **Presence avatars on-page** — Small avatar badges near viewport edges
- [ ] **Attention heatmaps** — Aggregated scroll/read depth per page (opt-in)
- [ ] **Daily digest** — Email/push summary of team activity (opt-in, aggregate only)

### 2.4 Out of Scope (v1)
- Voice/video calls (requires signaling + TURN; spec separately if demanded)
- Mobile browser support
- Self-hosted backend option
- Public/global presence (always private rooms only)
- AI summarization / auto-tagging (future enhancement)
- Canvas-rendered apps (Google Docs, Figma, PDFs in Chrome viewer), `chrome://` pages, iframes — annotate via page-level notes instead

---

## 3. User Stories & Acceptance Criteria

### 3.1 Workspace & Authentication

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-1.1 | As a user, I want to create a workspace so my team can collaborate | • Create workspace via extension popup → generates invite code (12-char, 7-day expiry, rate-limited)<br>• Workspace name editable<br>• Owner role assigned |
| US-1.2 | As a user, I want to join a workspace via invite link | • Click invite link → opens extension install or joins existing<br>• Shows workspace name, member count, roles before joining<br>• Auto-redirects to extension after install |
| US-1.3 | As a user, I want to sign in with Google so my identity is verified | • Google OAuth flow in popup<br>• Profile photo/name synced<br>• Session persists via refresh tokens (short-lived access + long-lived refresh) |
| US-1.4 | As an admin, I want to manage members and invites | • List members with roles (Owner/Admin/Member)<br>• Remove member, change role<br>• Revoke/regenerate invite code<br>• Transfer ownership (Owner only) |
| US-1.5 | As a user, I want to leave or delete a workspace | • Leave workspace (Member/Admin)<br>• Delete workspace (Owner only; cascades data)<br>• Export my data before leaving (GDPR) |

### 3.2 Privacy Controls

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-2.1 | As a user, I want to control what URLs are shared per domain | • Settings page with domain list (PSL-based matching: `example.com` matches `sub.example.com`)<br>• Three levels: **Hidden** (nothing sent), **Domain-only** (teammates see "visiting github.com"), **Full** (URL + title)<br>• Default: **Hidden** for all domains; first-run flow asks per domain |
| US-2.2 | As a user, I want default protection for sensitive categories | • Built-in blocklist using Public Suffix List: banking, email, health, social-DM, password managers<br>• User can add to blocklist but not remove without explicit warning<br>• Blocklist domains forced to Hidden |
| US-2.3 | As a user, I want incognito windows never tracked | • Manifest `"incognito": "not_allowed"` — extension **unavailable** in private windows<br>• No icon, no content script, no background activity in incognito |
| US-2.4 | As a user, I want to pause sharing instantly | • Toolbar icon: green (sharing) / grey (paused)<br>• One-click "Pause for 1 hour" / "Pause until tomorrow" / "Resume"<br>• Visual indicator in popup and side panel when paused |
| US-2.5 | As a user, I want to see and delete my shared activity | • Activity log in settings: "What your team saw today" (visits, highlights, comments)<br>• Delete individual entries or "Delete all"<br>• Deletion propagates to team feed (soft delete, admin audit log) |
| US-2.6 | As a user on a Hidden domain, I want to know highlighting is blocked | • Context menu "Highlight for team" disabled with tooltip: "Sharing disabled for this domain"<br>• Page-level notes still allowed (not sent to team unless domain is Domain-only/Full) |

### 3.3 Visit Feed & Page Identity

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-3.1 | As a user, I want to see a team feed of page visits | • Chronological list in side panel (Highlights/Chat/Feed tabs)<br>• Shows: avatar, page title, domain, timestamp, relative time<br>• Click entry → opens page in new tab |
| US-3.2 | As a user, I want the same article recognized across different URLs | • Canonical URL (`<link rel="canonical">`) fetched by content script, used as primary key<br>• Tracking params stripped per Appendix B allowlist; `ref`, `source` kept by default<br>• www. normalization, hash fragment **kept** for hash-routed apps<br>• HMAC-SHA256(pageKey, workspaceSecret) sent to server (not raw URL) |
| US-3.3 | As a user, I want duplicate visit alerts | • Banner in side panel: "3 teammates already visited this page"<br>• Shows their highlights/notes summary (respecting their share level)<br>• Dismissible per pageKey; doesn't reappear for same pageKey |

### 3.4 Presence Awareness

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-4.1 | As a user, I want to see who's currently on this page | • Badge in side panel header: "Alex, Sam on this page"<br>• Updates within 2s of tab focus/load via Broadcast channel<br>• Disappears within 5s of tab blur/close/navigation |
| US-4.2 | As a user, I want presence to respect my privacy settings | • **Hidden**: no presence sent, not counted in "N on this page"<br>• **Domain-only**: teammates see "on github.com" (no title/URL), counted<br>• **Full**: teammates see page title + URL, counted |
| US-4.3 | As a user, I want to see presence in the side panel | • Header shows avatars + count<br>• Hover → tooltip with names<br>• Click avatar → "Focus teammate" scrolls to their viewport position (Phase 3) |

### 3.5 Shared Highlights (Phase 2)

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-5.1 | As a user, I want to highlight text and share it with my team | • Select text → context menu "Highlight for team" (Alt+Shift+H)<br>• Color picker (auto-assigned per user, deterministic from userId)<br>• Highlight appears on-page for all teammates within 2s via Realtime |
| US-5.2 | As a user, I want highlights to persist across page reloads | • Anchored via: `quote.exact`, `quote.prefix` (~20 chars), `quote.suffix` (~20 chars), `position`, `xpath`<br>• Re-anchoring order: exact match → fuzzy (diff-match-patch) → position → XPath → **orphaned**<br>• Orphaned highlights shown in side panel with quoted text, not lost |
| US-5.3 | As a user, I want to add threaded comments to highlights | • Click highlight → comment input with markdown<br>• Threaded replies via `parentId` on Comment<br>• Mentions (@name) notify teammates via in-app notification |
| US-5.4 | As a user, I want to share a link to a specific highlight | • "Copy link to highlight" → copies `#:~:text=` URL + highlightId param<br>• Opens at correct position with highlight focused in side panel |
| US-5.5 | As a user, I want to search across all team highlights/notes | • Search tab in side panel: full-text over highlights, comments, page notes, visits<br>• Filters: by user, domain, date range, has comments<br>• Results open in context |

### 3.6 Side Panel, Chat & Notifications (Phase 2-3)

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-6.1 | As a user, I want a persistent side panel for highlights/comments/feed | • Chrome: `sidePanel` API (384px, full height)<br>• Firefox: `sidebar_action` (same UI, separate manifest entry)<br>• Toggle via extension icon or **Alt+Shift+C**<br>• Tabs: Highlights | Chat | Feed | Search |
| US-6.2 | As a user, I want a page-scoped chat | • Chat tab in side panel<br>• Messages persist per pageKey (not global)<br>• Markdown + code blocks + mentions<br>• Sanitized (DOMPurify) before render |
| US-6.3 | As a user, I want live cursors of teammates | • Colored cursor labels with names (Broadcast channel, batched 200ms)<br>• Only rendered when ≥2 users on same pageKey with Full/Domain-only share<br>• Smooth interpolation between updates |
| US-6.4 | As a user, I want notifications for mentions and alerts | • In-app notification bell in side panel header<br>• Triggers: @mention, duplicate-visit alert, digest<br>• `notifications` permission requested on first mention<br>• Daily digest opt-in: aggregate summary email/push at 9am local |

---

## 4. Functional Requirements

### 4.1 Extension Architecture (Manifest V3)

| Component | Responsibility | Lifecycle |
|-----------|----------------|-----------|
| **Offscreen Document** | **Persistent WebSocket/Realtime connection owner** — holds Supabase Realtime / WebSocket, handles presence, highlights, chat sync; communicates with content scripts via `chrome.runtime.sendMessage` | Created on install/login; kept alive by periodic ping (every 20s); recreated if closed |
| **Service Worker** | Auth, storage sync, alarms (cleanup, digest), context menus, side panel toggle, offline queue flush | Event-driven; no persistent connections |
| **Content Script** | Page interaction: DOM observation, highlight rendering, cursor display, text selection, canonical URL extraction, SPA navigation detection (`pushState`/`popstate`/`hashchange`) | Injected on all frames (`match_about_blank: true`, `all_frames: true`) |
| **Side Panel / Sidebar** | Primary UI: highlights, chat, feed, search, settings; reads/writes via offscreen document | Mounted on demand; communicates with offscreen doc via `chrome.runtime.sendMessage` |
| **Popup** | Quick status: workspace switcher, privacy toggle, pause/resume, recent activity (last 5) | Ephemeral; no persistent state |

**Why offscreen document:** MV3 service workers terminate after ~30s idle. Offscreen documents can hold long-lived connections and are the supported pattern for WebSockets/Realtime in MV3.

### 4.2 URL Normalization & Page Identity

```typescript
// Content script extracts canonical URL
function getCanonicalUrl(): string | null {
  const link = document.querySelector('link[rel="canonical"]');
  return link?.getAttribute('href') || null;
}

// Background normalizes
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'fbclid', 'gclid', 'gbraid', 'wbraid', 'mc_cid', 'mc_eid',
  'igshid', 'msclkid', 'ttclid', 'li_fat_id'
]);

// Per-domain allowlist (Appendix B) OVERRIDES tracking strip
const DOMAIN_ALLOWLIST: Record<string, string[]> = {
  'youtube.com': ['v', 'list', 't', 'si'],
  'github.com': [],
  'docs.google.com': ['id', 'documentId', 'usp'],
  'notion.so': [],
  'twitter.com': ['status', 's'],
  'x.com': ['status', 's'],
  'arxiv.org': ['abs', 'pdf'],
  'linkedin.com': [],
};

function normalizeUrl(raw: string, domain: string): string {
  const u = new URL(raw);
  // Keep hash for hash-routed apps
  u.hostname = u.hostname.replace(/^www\./, '');
  const allow = DOMAIN_ALLOWLIST[domain] || [];
  [...u.searchParams.keys()].forEach(k => {
    if (!allow.includes(k) && TRACKING_PARAMS.has(k.toLowerCase())) {
      u.searchParams.delete(k);
    }
  });
  u.searchParams.sort();
  let path = u.pathname.replace(/\/+$/, '') || '/';
  return u.hostname + path + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash;
}

// Page identity key sent to server
function getPageKey(normalized: string, workspaceSecret: string): string {
  // HMAC-SHA256 keyed with per-workspace secret (32 bytes, base64url)
  // Server never sees raw URL; can only verify if given a candidate URL
  return hmacSha256(workspaceSecret, normalized); // 64-char hex
}
```

### 4.3 Data Models

#### Workspace
```typescript
interface Workspace {
  id: string;                    // UUID
  name: string;
  ownerId: string;               // User ID
  inviteCode: string;            // 12-char alphanumeric
  inviteExpiresAt: number;       // epoch ms (7 days default)
  inviteRevoked: boolean;
  hmacSecret: string;            // base64url 32-byte secret for pageKey HMAC
  createdAt: number;
  settings: WorkspaceSettings;
  deletedAt?: number;
}

interface WorkspaceSettings {
  defaultShareLevel: 'hidden' | 'domain' | 'full';  // default: 'hidden'
  blockedDomains: string[];      // PSL-matched domains forced to Hidden
  maxRoomSize: number;           // default 20
  digestEnabled: boolean;        // default false
  digestTime: string;            // "09:00" local
  heatmapEnabled: boolean;       // default false
}
```

#### User
```typescript
interface User {
  id: string;                    // UUID
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
  color: string;                 // deterministic: hsl(hash(userId)*360, 60%, 45%)
  role: 'owner' | 'admin' | 'member';
  workspaces: WorkspaceMembership[];
  createdAt: number;
  lastActiveAt: number;
}

interface WorkspaceMembership {
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  shareLevelOverrides: DomainShareRule[];  // per-user domain rules
}
```

#### DomainShareRule
```typescript
type ShareLevel = 'hidden' | 'domain' | 'full';

interface DomainShareRule {
  domain: string;                // e.g., "github.com" (PSL-matched: matches sub.github.com)
  level: ShareLevel;
  isBlocklist: boolean;          // true = forced Hidden, cannot be overridden
}
```

#### PageVisit
```typescript
interface PageVisit {
  id: string;                    // UUID
  workspaceId: string;
  userId: string;
  pageKey: string;               // HMAC-SHA256
  url?: string;                  // only if shareLevel === 'full' (encrypted at rest)
  title?: string;                // only if shareLevel !== 'hidden'
  domain: string;
  shareLevel: ShareLevel;
  timestamp: number;
  dwellMs: number;               // actual dwell time
  metadata?: {
    canonicalUrl?: string;
    referrer?: string;
    isSpaNavigation?: boolean;
  };
}
```

#### Highlight
```typescript
interface Highlight {
  id: string;                    // UUID
  workspaceId: string;
  pageKey: string;
  userId: string;
  color: string;                 // user's assigned color
  quote: {
    exact: string;
    prefix: string;              // ~20 chars before
    suffix: string;              // ~20 chars after
  };
  position: { start: number; end: number }; // char offsets in page textContent
  xpath: string;                 // structural hint (relative to body)
  commentCount: number;
  isOrphaned: boolean;           // re-anchoring failed
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

#### Comment
```typescript
interface Comment {
  id: string;
  highlightId: string;
  userId: string;
  content: string;               // markdown (sanitized)
  parentId?: string;             // for threaded replies
  mentions: string[];            // user IDs
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

#### PageNote (Phase 2)
```typescript
interface PageNote {
  id: string;
  workspaceId: string;
  pageKey: string;
  userId: string;
  content: string;               // markdown
  createdAt: number;
  updatedAt: number;
}
```

#### Presence (ephemeral, Broadcast/Presence channels)
```typescript
interface PresenceEvent {
  type: 'join' | 'leave' | 'focus' | 'blur' | 'cursor' | 'scroll';
  workspaceId: string;
  pageKey: string;
  userId: string;
  userName: string;
  userColor: string;
  shareLevel: ShareLevel;        // for reciprocity filtering
  data?: {
    cursorX?: number;
    cursorY?: number;
    scrollY?: number;
    viewportHeight?: number;
    timestamp: number;
  };
}
```

#### Notification
```typescript
interface Notification {
  id: string;
  workspaceId: string;
  userId: string;                // recipient
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
```

---

## 5. Non-Functional Requirements

### 5.1 Performance
| Metric | Target |
|--------|--------|
| Extension popup open latency | < 200ms |
| Content script injection | < 50ms |
| Highlight render on page load | < 100ms |
| Presence update latency (same page) | < 500ms |
| Offscreen doc reconnect time | < 3s |
| Memory usage (content script) | < 10MB |
| CPU idle (no active page) | < 1% |
| Side panel open latency | < 300ms |

### 5.2 Scalability (Realistic)
| Tier | Realtime Connections | Notes |
|------|---------------------|-------|
| Supabase Free | ~200 concurrent | Dev only |
| Supabase Pro ($25/mo) | ~5,000 | Start here |
| Supabase Team ($599/mo) | ~20,000 | Growth |
| Firebase Spark | ~100 | Dev only |
| Firebase Blaze | Pay per connection | Production |

**Architecture for scale:**
- Room-based pub/sub: 1 Broadcast channel per workspace for presence/cursors
- 1 Realtime channel per workspace for highlights/comments (DB changes)
- Presence events fan out **only to users on same pageKey** (filter in Realtime RLS)
- Visit history: async DB write (batch every 5s), not real-time
- Offscreen doc sends heartbeat every 20s to keep connection alive
- Cap workspace at 20 members (configurable to 50 max)

### 5.3 Reliability
- Offline queue: IndexedDB in offscreen doc; store visits/highlights/comments locally, sync on reconnect with conflict resolution (last-write-wins + vector clock for highlights)
- WebSocket/Realtime: exponential backoff reconnect (1s, 2s, 4s, 8s, max 30s)
- Data persistence: 99.9% durability (managed Postgres with PITR)
- Extension auto-update: seamless; offscreen doc reloads on update

### 5.4 Security
- All API calls over HTTPS/WSS
- JWT access tokens (15min) + refresh tokens (30 days, rotating)
- Row-level security (Supabase RLS): users only access their workspace data
- Content Security Policy: `script-src 'self' 'wasm-unsafe-eval'`; no inline scripts
- No page content sent unless user highlights/clips
- Injected UI isolated in **Shadow DOM** (open mode) to prevent CSS bleed
- Markdown sanitized with DOMPurify before render in side panel
- HMAC pageKey: server cannot reconstruct URLs without workspace secret

### 5.5 Privacy
- GDPR/CCPA compliant: right to access, delete, export (endpoints in §6.2)
- Data retention: visits auto-deleted after 30 days; highlights retained until user/workspace deletion
- No analytics/tracking beyond operational metrics (see §10)
- Open-source extension code (backend can be closed)
- **Anti-surveillance guarantee:** Admins have no elevated visibility; all data governed by member's share level

### 5.6 Accessibility & i18n
- WCAG 2.1 AA: keyboard navigation, focus indicators, color contrast, ARIA labels
- Screen reader support for side panel, highlights, notifications
- i18n-ready: all strings in `messages.json`; support en, es, fr, de, ja, zh-CN (Phase 2+)

---

## 6. Technical Architecture

### 6.1 System Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Extension                        │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Offscreen   │  │   Service Worker │  │  Content Script  │  │
│  │  Document    │◄─▶│  (Auth, Alarms,  │◄─▶│  (All frames,    │  │
│  │  (Realtime   │  │   Offline Queue,  │  │   Shadow DOM UI) │  │
│  │   + WS)      │  │   Context Menus) │  │                  │  │
│  └──────┬───────┘  └──────────────────┘  └────────┬─────────┘  │
│         │                                         │            │
│         │                    ┌────────────────────┘            │
│         │                    ▼                                 │
│         │  ┌──────────────────────────┐                        │
│         └─▶│      Side Panel /        │                        │
│            │      Sidebar (Firefox)   │                        │
│            └──────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTPS / WSS (Realtime)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Backend                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Supabase   │  │  Postgres    │  │  Realtime    │          │
│  │   Auth       │  │  (RLS)       │  │  (Broadcast, │          │
│  │              │  │              │  │   Presence,  │          │
│  └──────────────┘  └──────────────┘  │   DB Changes)│          │
│                                      └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 API Contracts

#### REST (HTTPS) — Supabase Edge Functions / Node.js
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/google` | Exchange Google ID token for JWT pair | Public |
| POST | `/auth/refresh` | Rotate refresh token, issue new access | Refresh token |
| GET | `/workspaces/:id` | Get workspace details | Member |
| POST | `/workspaces` | Create workspace | Auth |
| POST | `/workspaces/:id/join` | Join via invite code | Auth |
| PATCH | `/workspaces/:id` | Update settings (Owner/Admin) | Owner/Admin |
| POST | `/workspaces/:id/invite/regenerate` | New invite code, revoke old | Owner/Admin |
| POST | `/workspaces/:id/members/:userId/remove` | Remove member | Owner/Admin |
| POST | `/workspaces/:id/members/:userId/role` | Change role | Owner |
| POST | `/workspaces/:id/transfer` | Transfer ownership | Owner |
| DELETE | `/workspaces/:id` | Delete workspace (cascade) | Owner |
| GET | `/visits` | Paginated visit feed (cursor) | Member |
| POST | `/visits` | Record visit (batch up to 50) | Member |
| GET | `/highlights` | Get highlights for pageKey(s) | Member |
| POST | `/highlights` | Create highlight | Member |
| PATCH | `/highlights/:id` | Update (color, commentCount) | Author |
| DELETE | `/highlights/:id` | Soft delete highlight | Author |
| GET | `/highlights/:id/comments` | Get comments (threaded) | Member |
| POST | `/highlights/:id/comments` | Add comment | Member |
| PATCH | `/comments/:id` | Edit comment | Author |
| DELETE | `/comments/:id` | Soft delete comment | Author |
| GET | `/page-notes` | Get page notes for pageKey | Member |
| POST | `/page-notes` | Create/update page note | Member |
| GET | `/search` | Full-text search (visits, highlights, comments, notes) | Member |
| GET | `/users/me/activity` | My shared activity log (paginated) | Auth |
| DELETE | `/users/me/activity/:id` | Delete activity entry | Auth |
| GET | `/users/me/export` | GDPR export (all my data) | Auth |
| DELETE | `/users/me` | Delete account (cascade) | Auth |
| GET | `/notifications` | Paginated notifications | Auth |
| PATCH | `/notifications/:id/read` | Mark read | Auth |
| POST | `/notifications/read-all` | Mark all read | Auth |

#### Realtime Channels (Supabase Realtime)
| Channel | Type | Events | RLS Filter |
|---------|------|--------|------------|
| `workspace:{id}:presence` | Broadcast | `join`, `leave`, `focus`, `blur`, `cursor`, `scroll` | `shareLevel != 'hidden' AND pageKey = current` |
| `workspace:{id}:highlights` | Postgres Changes | `INSERT`, `UPDATE`, `DELETE` on `highlights` | `workspace_id = :id` |
| `workspace:{id}:comments` | Postgres Changes | `INSERT`, `UPDATE`, `DELETE` on `comments` | `workspace_id = :id` |
| `workspace:{id}:page_notes` | Postgres Changes | `INSERT`, `UPDATE`, `DELETE` on `page_notes` | `workspace_id = :id` |
| `workspace:{id}:notifications` | Broadcast | `mention`, `duplicate_visit`, `digest` | `user_id = current_user` |

### 6.3 Extension Permissions (Manifest V3)
```json
{
  "permissions": [
    "activeTab",
    "storage",
    "identity",
    "sidePanel",
    "contextMenus",
    "scripting",
    "alarms",
    "tabs",
    "offscreen",
    "notifications"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "optional_host_permissions": [],
  "incognito": "not_allowed",
  "offscreen": {
    "reasons": ["DOM_SCRAPING", "WORKERS"],
    "minimize": true
  }
}
```
**Justification for `<all_urls>`:** Presence and highlighting require content scripts on arbitrary pages. `activeTab` only grants access on click, which breaks passive awareness. Web Store review requires clear user-facing justification — provided in privacy policy and onboarding.

---

## 7. UI/UX Specification

### 7.1 Extension Popup (360px × 420px)
```
┌─────────────────────────────────────────┐
│  Copage          [Workspace ▼]  [⚙]     │
├─────────────────────────────────────────┤
│  🟢 Sharing        [Pause ▼]            │
│  2 teammates on this page               │
│  ● Alex Chen    ● Sam Rivera            │
├─────────────────────────────────────────┤
│  Recent Team Activity                   │
│  ─────────────────────────────────────  │
│  📄 Alex visited "React 19 Release"     │
│     github.com • 2m ago                 │
│  🖍️ Sam highlighted "New compiler..."   │
│     blog.example.com • 15m ago          │
│  📄 You visited "TypeScript 5.5"        │
│     dev.to • 1h ago                     │
├─────────────────────────────────────────┤
│  [Open Side Panel]  [View Full Feed]    │
└─────────────────────────────────────────┘
```

### 7.2 Side Panel / Sidebar (384px wide, full height)
```
┌─────────────────────────────────────────┐
│  [Page Title]                    [👥 2] │
│  [🔔 3] [🔍] [⚙]                        │
├─────────────────────────────────────────┤
│  [Highlights] [Chat] [Feed] [Search]    │
├─────────────────────────────────────────┤
│  Highlights (3)                         │
│  ─────────────────────────────────────  │
│  ● Alex Chen  🔵                        │
│  "The new compiler reduces..."          │
│  ─────────────────────────────────────  │
│  ● Sam Rivera  🟢                       │
│  "Bundle size improved by..."           │
│     └─ 💬 "Great find!" — You           │
│  ─────────────────────────────────────  │
│  + Add highlight                        │
└─────────────────────────────────────────┘
```

### 7.3 On-Page Highlight Rendering (in Shadow DOM)
- Background: user's color at 15% opacity
- Border-left: 3px solid user's color
- Hover: tooltip with user name, timestamp, comment count
- Click: focus side panel on that highlight
- Orphaned: dashed border, tooltip "Anchor lost — showing quoted text"

### 7.4 Privacy Settings Page
```
Domain Sharing Rules
────────────────────
Default: Hidden (first-run asks per domain)

[Search domains...]

github.com           ▼ Full        [Edit] [Delete]
google.com           ▼ Domain-only [Edit] [Delete]
gmail.com            ▼ Hidden      [Edit] [Delete]
mybank.com           ▼ Hidden 🔒   (blocklist - cannot change)
linkedin.com/messaging ▼ Hidden 🔒 (blocklist - cannot change)

[+ Add Domain Rule]

Quick Actions
────────────────────
[Pause for 1 hour]  [Pause until tomorrow]  [Resume Sharing]

Anti-Surveillance Notice
────────────────────────
"Admins cannot see more than you choose to share.
Your domain rules apply to everyone equally."
```

### 7.5 Keyboard Shortcuts (No Browser Collisions)
| Action | Shortcut (Win/Linux) | Shortcut (Mac) |
|--------|---------------------|----------------|
| Open side panel | `Alt+Shift+C` | `Alt+Shift+C` |
| Toggle highlight mode | `Alt+Shift+H` | `Alt+Shift+H` |
| Pause/Resume sharing | `Alt+Shift+P` | `Alt+Shift+P` |
| Open popup | `Alt+Shift+Y` | `Alt+Shift+Y` |
| Focus search | `Alt+Shift+F` | `Alt+Shift+F` |
| New page note | `Alt+Shift+N` | `Alt+Shift+N` |

---

## 8. Build Phases & Milestones

### Phase 0: Foundations (Week 1)
- Repo setup: Manifest V3, TypeScript, Vite, Biome, Vitest, Playwright
- Supabase project: Auth, Postgres, Realtime, Edge Functions
- CI/CD: GitHub Actions (lint, typecheck, test, build, package)
- Offscreen document scaffold + Realtime client
- Basic service worker + message passing

### Phase 1: Core MVP (Weeks 2-6)
| Week | Deliverable |
|------|-------------|
| 2 | Google OAuth, JWT pair, workspace create/join, invite codes (12-char, 7-day expiry, rate limit) |
| 3 | URL normalization (canonical, PSL domain matching, HMAC pageKey), visit recording (dwell ≥10s, SPA nav), visit feed API |
| 4 | Offscreen doc: Realtime connection, presence Broadcast channel (join/leave/focus/blur), popup presence badge |
| 5 | Privacy controls: domain rules UI (PSL matching), default blocklist, pause/resume, activity log with delete |
| 6 | Roles (Owner/Admin/Member), member management, invite regenerate/revoke, transfer ownership, delete workspace, anti-surveillance policy doc |

**Milestone 1 (End of Week 6):** Team can create workspace, join, visit pages, see each other's visits in feed, control privacy per domain, manage members. **No Firefox yet.**

### Phase 2: Annotations & Search (Weeks 7-11)
| Week | Deliverable |
|------|-------------|
| 7 | Text selection → highlight creation (context menu + Alt+Shift+H), quote/prefix/suffix/position/XPath anchoring, color assignment |
| 8 | Highlight rendering in Shadow DOM, re-anchoring pipeline (exact → fuzzy → position → XPath → orphaned), side panel Highlights tab |
| 9 | Comments with threading (`parentId`), mentions, markdown sanitization, notifications for mentions |
| 10 | Page notes, text fragment links (`#:~:text=`), side panel Chat tab (page-scoped) |
| 11 | Full-text search (Postgres `tsvector` + `websearch_to_tsquery`), side panel Search tab, filters |

**Milestone 2 (End of Week 11):** Full collaborative annotation experience with search.

### Phase 3: Live Features & Polish (Weeks 12-15)
| Week | Deliverable |
|------|-------------|
| 12 | Live cursors + scroll (Broadcast channel, 200ms batch, interpolation), presence avatars on-page |
| 13 | Attention heatmaps (opt-in, aggregated scroll depth), daily digest (opt-in, aggregate only, 9am local) |
| 14 | Firefox support: `sidebar_action` manifest, polyfill `sidePanel` API, cross-browser testing |
| 15 | Performance optimization, accessibility audit (WCAG 2.1 AA), i18n (en, es, fr, de, ja, zh-CN), store assets |

**Milestone 3 (End of Week 15):** Chrome Web Store + Firefox Add-ons submission.

### Phase 4: Store Review Buffer (Weeks 16-18)
- Chrome review for `<all_urls>`: typically 2-4 weeks; respond to queries
- Firefox review: typically 1-2 weeks
- Hotfixes, monitoring, gradual rollout

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chrome Web Store rejection (`<all_urls>`) | Medium | High | Detailed privacy policy, onboarding justification, minimal data collection, open-source extension |
| Annotation anchoring breaks on dynamic sites | High | Medium | Use Hypothesis `dom-anchor-text-quote/position` packages; orphaned fallback; test on SPA-heavy sites (Notion, GitHub, Twitter) |
| Realtime costs at scale | Medium | High | Broadcast/Presence for cursors (cheap); DB-change streams only for highlights/comments; paid Supabase tier at launch |
| Firefox `sidebar_action` UX differs | Medium | Low | Accept narrower sidebar; no `sidePanel` API parity; document differences |
| Privacy backlash / employer surveillance | Low | Critical | Privacy-first defaults (Hidden); anti-surveillance policy; no admin override; open-source extension |
| HMAC pageKey collision (theoretical) | Negligible | Low | 256-bit HMAC; workspace secret rotation endpoint if ever needed |
| Offscreen document killed by browser | Low | Medium | Heartbeat every 20s; `chrome.offscreen.hasDocument()` check on each event; auto-recreate |
| Invite code brute force | Low | Medium | 12-char alphanumeric (62^12); rate limit 5 attempts/min/IP; expiry 7 days; revocable |

---

## 10. Success Metrics & Privacy-Preserving Analytics

### 10.1 Activation (Weeks 1-4 post-launch)
- Workspaces created: > 50
- Invite acceptance rate: > 60%
- Daily active users (DAU): > 100

### 10.2 Engagement (Month 2-3)
- Highlights per user/week: > 5
- Pages with teammate presence: > 30% of visits
- Side panel open rate: > 40% of sessions
- Search queries per user/week: > 3
- 7-day retention: > 40%

### 10.3 Growth (Month 3-6)
- Workspaces with > 5 members: > 20%
- Viral coefficient (invites per user): > 0.5
- NPS: > 40 (in-app survey, quarterly)

### 10.4 Analytics Implementation (Privacy-Preserving)
- **No PII:** All metrics aggregated, no user/workspace IDs
- **Client-side aggregation:** Extension batches counters locally, sends daily via `navigator.sendBeacon` to `/analytics/aggregate`
- **Metrics collected:** `dau`, `visits_recorded`, `highlights_created`, `comments_created`, `searches_performed`, `side_panel_opens`, `presence_events_received`, `pause_resume_toggles`
- **Opt-out:** Global toggle in settings; respected immediately
- **No third-party analytics:** No GA, Mixpanel, etc.

---

## 11. Open Questions

1. **Pricing model:** Free forever? Freemium (room size, history retention, heatmaps, digest)? Team plans?
2. **Self-hosted option:** Enterprise demand? Timeline?
3. **Mobile:** Companion iOS/Android app for feed viewing? Safari extension (different architecture)?
4. **Integrations:** Slack/Notion/Linear webhooks for highlights/comments?
5. **AI features:** Auto-summarize highlights? Suggest related pages? Semantic search? (Phase 4+)
6. **Canvas/iframe annotation:** Proxy via page notes only, or explore `ElementInternals` / ARIA for Google Docs?

---

## 12. Standard PRD Sections

### 12.1 Onboarding & Empty States
| State | UI |
|-------|----|
| First install | Welcome screen → Google OAuth → "Create or join workspace" → Domain permission primer (Hidden default) |
| Empty workspace | "Invite your team" with copyable link + QR code |
| Empty feed | "Your team's activity appears here" + link to privacy settings |
| No highlights on page | "Be the first to highlight" + context menu hint |
| No search results | "Try broader terms" + filters help |

### 12.2 Error States
- **Offline:** Yellow banner "Syncing when online…" + offline queue count
- **Realtime disconnected:** Grey "Reconnecting…" spinner in side panel header
- **Highlight anchor failed:** Orphaned badge + "Anchor lost" tooltip
- **Invite expired:** "This invite has expired. Ask for a new one."
- **Store update pending:** "Update available — click to reload"

### 12.3 Browser Support Matrix
| Browser | Version | Support | Notes |
|---------|---------|---------|-------|
| Chrome | 114+ | Full | Side panel API |
| Edge | 114+ | Full | Same as Chrome |
| Firefox | 120+ | Full | `sidebar_action`; no side panel API |
| Safari | 17+ | Planned | Different extension model (Phase 4) |
| Brave/Vivaldi | Current | Full | Chromium-based |

### 12.4 Testing & Release Criteria
- **Unit tests:** > 80% coverage (Vitest) for normalization, anchoring, crypto, RLS policies
- **Integration tests:** Playwright for extension UI flows (install, auth, highlight, presence)
- **E2E tests:** Multi-browser (Chrome, Firefox) with 2+ simulated users
- **Performance budgets:** Enforced in CI (Lighthouse CI for side panel)
- **Release gates:** All tests pass + manual smoke test + accessibility audit + privacy review

### 12.5 GDPR & Privacy Deliverables
- Privacy Policy (plain language, hosted at `/privacy`)
- Data Processing Addendum (for teams)
- GDPR export endpoint (`/users/me/export`) — JSON + human-readable HTML
- Deletion endpoint (`/users/me`) — 30-day grace, then hard delete
- Cookie notice: none (no cookies; uses `chrome.identity` + Supabase Auth)
- DPA with Supabase (subprocessor)

### 12.6 Competitive Analysis
| Tool | Presence | Highlights | Notes | Search | Privacy | Platform |
|------|----------|------------|-------|--------|---------|----------|
| **Copage** | ✅ Real-time | ✅ Anchored | ✅ Page + thread | ✅ Full-text | ✅ Hidden default | Browser ext |
| Hypothesis | ❌ | ✅ Anchored | ✅ Threaded | ✅ | ⚠️ Public/default | Browser ext |
| Notion Web Clipper | ❌ | ❌ | ✅ Page save | ✅ | ⚠️ Workspace | Browser ext |
| Figma | ✅ Cursors | ❌ | ✅ Comments | ❌ | Team-only | Web app |
| Google Docs | ✅ Avatars | ❌ | ✅ Comments | ❌ | Domain-only | Web app |
| Toby | ❌ | ❌ | ✅ Collections | ❌ | Local-only | Browser ext |
| Memex | ❌ | ✅ Local | ✅ Local | ✅ Local | ✅ Local-first | Browser ext |

**Differentiator:** Real-time presence + anchored highlights + team search + privacy-first — all in a browser extension.

### 12.7 Dependencies
| Dependency | Version | Purpose | Risk |
|------------|---------|---------|------|
| `@supabase/supabase-js` | ^2.39 | Auth, DB, Realtime | Low (mature) |
| `dom-anchor-text-quote` | ^1.0 | Highlight anchoring | Medium (Hypothesis-maintained) |
| `dom-anchor-text-position` | ^1.0 | Position fallback | Medium |
| `diff-match-patch` | ^1.0 | Fuzzy re-anchoring | Low (Google) |
| `dompurify` | ^3.0 | Markdown sanitization | Low (mature) |
| `public-suffix-list` | ^1.0 | Domain matching | Low |
| `uuid` | ^9.0 | ID generation | Low |
| `zustand` | ^4.4 | Client state | Low |

---

## 13. Appendix

### A. Default Blocklist (PSL-Matched — Forced Hidden)
```typescript
// Matches domain AND all subdomains via Public Suffix List
const BLOCKLIST_DOMAINS = [
  // Banking & Finance (examples — expand via PSL)
  'chase.com', 'wellsfargo.com', 'bankofamerica.com', 'citibank.com',
  'americanexpress.com', 'capitalone.com', 'discover.com',
  // Email
  'mail.google.com', 'outlook.live.com', 'protonmail.com', 'fastmail.com',
  // Health (patient portals)
  'mychart.com', 'epic.com', 'cerner.com', 'athenahealth.com',
  // Social DMs
  'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'facebook.com',
  // Password Managers
  '1password.com', 'bitwarden.com', 'lastpass.com', 'dashlane.com',
  // Auth/Crypto
  'authenticator', 'wallet', 'coinbase.com', 'binance.com',
];
```
*Implementation:* Use `psl` package: `psl.get(domain) === psl.get(blocklistedDomain)`.

### B. Per-Domain Query Param Allowlist (Overrides Tracking Strip)
```json
{
  "youtube.com": ["v", "list", "t", "si", "pp", "share"],
  "github.com": [],
  "docs.google.com": ["id", "documentId", "usp", "resourcekey"],
  "notion.so": [],
  "twitter.com": ["status", "s", "t"],
  "x.com": ["status", "s", "t"],
  "arxiv.org": ["abs", "pdf", "format"],
  "linkedin.com": ["feedUpdate", "trackingId"],
  "medium.com": ["source", "sk"],
  "reddit.com": ["context", "share_id"],
  "stackoverflow.com": ["answertab", "pagesize"],
  "nytimes.com": ["smid", "shareType"],
  "washingtonpost.com": ["tid", "share"],
  "theguardian.com": ["CMP", "share"]
}
```

### C. Visit Definition (Operational)
```typescript
const VISIT_CONFIG = {
  minDwellMs: 10_000,           // 10 seconds minimum
  maxIdleMs: 60_000,            // Tab blur > 60s = visit ends
  dedupeWindowMs: 5_000,        // Reload/nav within 5s = same visit
  spaNavigationEvents: ['pushState', 'replaceState', 'popstate', 'hashchange'],
  sampleRate: 1.0,              // 100% (adjust for scale)
};
```

### D. Re-anchoring Pipeline (Highlight Persistence)
```typescript
function reanchor(highlight: Highlight, pageText: string, pageDOM: Document): AnchorResult {
  // 1. Exact quote + prefix + suffix match
  const exactMatch = findExact(pageText, highlight.quote);
  if (exactMatch) return { ...exactMatch, method: 'exact' };

  // 2. Fuzzy match (diff-match-patch) — Levenshtein ≤ 3 edits
  const fuzzyMatch = findFuzzy(pageText, highlight.quote.exact, { threshold: 0.8 });
  if (fuzzyMatch) return { ...fuzzyMatch, method: 'fuzzy' };

  // 3. Character position (if page length similar)
  if (Math.abs(pageText.length - (highlight.position.end)) < 500) {
    const posMatch = { start: highlight.position.start, end: highlight.position.end };
    if (isValidPosition(pageText, posMatch)) return { ...posMatch, method: 'position' };
  }

  // 4. XPath (structural)
  const xpathMatch = findByXPath(pageDOM, highlight.xpath);
  if (xpathMatch) return { ...xpathMatch, method: 'xpath' };

  // 5. Orphaned
  return { orphaned: true, quote: highlight.quote };
}
```

### E. Keyboard Shortcuts (Final)
| Action | Shortcut |
|--------|----------|
| Open side panel | `Alt+Shift+C` |
| Toggle highlight mode | `Alt+Shift+H` |
| Pause/Resume sharing | `Alt+Shift+P` |
| Open popup | `Alt+Shift+Y` |
| Focus search | `Alt+Shift+F` |
| New page note | `Alt+Shift+N` |
| Copy highlight link | `Alt+Shift+L` (when highlight focused) |

---

## 14. Changelog (v1.0 → v1.1)

| Area | Change |
|------|--------|
| Architecture | WebSocket moved from Service Worker → **Offscreen Document** (MV3 compliant) |
| Incognito | Fixed: `"incognito": "not_allowed"` means **extension unavailable**, not "icon shows paused" |
| Scalability | Corrected free-tier limits; added Broadcast/Presence channel strategy |
| Firefox | Added `sidebar_action` fallback; Phase 3 target |
| Page Identity | HMAC-SHA256 with per-workspace secret; hash fragment kept; per-domain allowlist |
| Blocklist | PSL-based matching; no wildcards |
| Shortcuts | All changed to `Alt+Shift+…` to avoid browser collisions |
| Phases | Unified: Presence/Privacy in Phase 1, Highlights in Phase 2, Live in Phase 3 |
| Permissions | Justified `<all_urls>`; added `offscreen`, `notifications` |
| Default Share Level | Changed to **Hidden**; first-run asks per domain |
| Analytics | Defined privacy-preserving aggregate-only approach |
| Hidden + Highlights | Highlighting blocked on Hidden domains; page notes allowed |
| URL Normalizer | Uses canonical URL; respects allowlist; keeps hash |
| Comments | Added `parentId` for threading |
| Missing Specs | Added: visit definition, presence reciprocity, roles, anti-surveillance, invite security, content safety, unannotatable pages, notifications, search, page notes, heatmaps, digest, missing endpoints, onboarding, accessibility, i18n, browser matrix, testing criteria, GDPR deliverables, competitive analysis, dependencies, timeline buffer |

---

*End of PRD v1.1*