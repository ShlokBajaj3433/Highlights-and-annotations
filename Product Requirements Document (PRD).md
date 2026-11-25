# Product Requirements Document: Copage (Working Title)

**Version:** 1.0  
**Status:** Draft  
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

### 2.1 In Scope (MVP - Phase 1)
- [ ] **Room/Workspace system** — Create/join teams via invite links
- [ ] **URL normalization & page identity** — Canonical URL detection, tracking param stripping, hash-based deduplication
- [ ] **Visit feed** — Chronological team activity log (who visited what, when)
- [ ] **Presence badge** — "N teammates on this page" indicator in extension popup
- [ ] **Privacy controls** — Per-domain sharing levels (Hidden / Domain-only / Full), default blocklist, pause button
- [ ] **Authentication** — Google OAuth for team identity

### 2.2 In Scope (Phase 2)
- [ ] **Shared highlights** — Text selection → highlight saved with quote/prefix/suffix anchoring
- [ ] **Highlight visibility** — Color-coded per user, visible on-page via content script
- [ ] **Sidebar** — Floating panel showing highlights, comments, and chat for current page
- [ ] **Text fragment links** — Share `#:~:text=` deep links to highlighted passages

### 2.3 In Scope (Phase 3)
- [ ] **Live cursors** — Real-time cursor/scroll position of teammates on same page
- [ ] **Page chat** — URL-scoped chat in sidebar
- [ ] **Presence avatars on-page** — Small avatar badges near viewport edges
- [ ] **Voice/video bubbles** — Quick call initiation while co-browsing

### 2.4 Out of Scope
- Full screen sharing / co-browsing control
- Mobile browser support (Phase 4+)
- Self-hosted backend option (post-MVP)
- Public/global presence (always private rooms only)
- AI summarization / auto-tagging (future enhancement)

---

## 3. User Stories & Acceptance Criteria

### 3.1 Room & Authentication

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-1.1 | As a user, I want to create a workspace so my team can collaborate | • Create workspace via extension popup<br>• Generates unique invite link<br>• Workspace name editable |
| US-1.2 | As a user, I want to join a workspace via invite link so I can collaborate | • Click invite link → opens extension install or joins existing<br>• Shows workspace name and member count before joining<br>• Auto-redirects to extension after install |
| US-1.3 | As a user, I want to sign in with Google so my identity is verified | • Google OAuth flow in popup<br>• Profile photo/name synced<br>• Session persists across browser restarts |

### 3.2 Privacy Controls

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-2.1 | As a user, I want to control what URLs are shared per domain | • Settings page with domain list<br>• Three levels: Hidden / Domain-only / Full<br>• Default: Hidden for banking, email, health, social-DM domains |
| US-2.2 | As a user, I want to pause sharing instantly | • Toolbar icon: green (sharing) / grey (paused)<br>• One-click "Pause for 1 hour" option<br>• Visual indicator in popup when paused |
| US-2.3 | As a user, I want incognito windows never tracked | • Manifest `"incognito": "not_allowed"`<br>• No data sent from incognito tabs<br>• Icon shows "Incognito - not sharing" in private windows |
| US-2.4 | As a user, I want to see and delete my shared activity | • Activity log in settings: "What your team saw today"<br>• Delete individual entries or "Delete all"<br>• Deletion propagates to team feed |

### 3.3 Visit Feed & Page Identity

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-3.1 | As a user, I want to see a team feed of page visits | • Chronological list in extension popup/sidebar<br>• Shows: avatar, page title, domain, timestamp, relative time<br>• Click entry → opens page in new tab |
| US-3.2 | As a user, I want the same article recognized across different URLs | • Canonical URL (`<link rel="canonical">`) used as primary key<br>• Tracking params (utm_, fbclid, gclid, etc.) stripped<br>• www. normalization, hash fragment dropped<br>• SHA-256 hash sent to server (not raw URL) |
| US-3.3 | As a user, I want duplicate visit alerts | • Banner: "3 teammates already visited this page"<br>• Shows their highlights/notes summary<br>• Dismissible, doesn't reappear for same page |

### 3.4 Presence Awareness

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-4.1 | As a user, I want to see who's currently on this page | • Badge in popup: "Alex, Sam on this page"<br>• Updates within 2s of tab focus/load<br>• Disappears within 5s of tab blur/close |
| US-4.2 | As a user, I want presence to respect my privacy settings | • If domain set to "Hidden": no presence sent<br>• If "Domain-only": teammates see "on github.com" not full URL<br>• If "Full": teammates see page title + URL |
| US-4.3 | As a user, I want to see presence in the sidebar on-page | • Small indicator in sidebar header<br>• Hover → tooltip with names/avatars<br>• Click → focus teammate's viewport (Phase 3) |

### 3.5 Shared Highlights (Phase 2)

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-5.1 | As a user, I want to highlight text and share it with my team | • Select text → context menu "Highlight for team"<br>• Color picker (auto-assigned per user)<br>• Highlight appears on-page for all teammates within 2s |
| US-5.2 | As a user, I want highlights to persist across page reloads | • Anchored via quote + prefix/suffix + position + XPath<br>• Re-anchoring: exact match → fuzzy match → position → XPath → orphaned<br>• Orphaned highlights shown in sidebar with quoted text |
| US-5.3 | As a user, I want to add comments to highlights | • Click highlight → comment input<br>• Threaded replies<br>• Mentions (@name) notify teammates |
| US-5.4 | As a user, I want to share a link to a specific highlight | • "Copy link to highlight" → copies `#:~:text=` URL<br>• Opens at correct position with highlight visible |

### 3.6 Sidebar & Chat (Phase 2-3)

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-6.1 | As a user, I want a sidebar showing all highlights/comments for this page | • Toggle via extension icon or keyboard shortcut (Ctrl+Shift+C)<br>• Lists highlights chronologically, grouped by user<br>• Click highlight → scrolls to position on page |
| US-6.2 | As a user, I want a page-scoped chat | • Chat tab in sidebar<br>• Messages persist per page (not global)<br>• Supports markdown, code blocks, links |
| US-6.3 | As a user, I want to see live cursors of teammates | • Colored cursor labels with names<br>• Smooth position updates (batched 200-500ms)<br>• Only rendered when ≥2 users on same page |

---

## 4. Functional Requirements

### 4.1 Extension Architecture (Manifest V3)

| Component | Responsibility |
|-----------|----------------|
| **Service Worker** | Background logic: auth, WebSocket connection, URL normalization, storage sync, alarm for periodic cleanup |
| **Content Script** | Page interaction: DOM observation, highlight rendering, cursor display, sidebar injection, text selection handling |
| **Popup** | Quick status: presence badge, privacy toggle, recent activity, workspace switcher |
| **Options Page** | Full settings: domain rules, privacy controls, activity log, team management |
| **Side Panel** (Chrome 114+) | Persistent sidebar for highlights, chat, feed — replaces injected sidebar for reliability |

### 4.2 URL Normalization Algorithm

```typescript
function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  u.hostname = u.hostname.replace(/^www\./, "");
  const TRACKING = /^(utm_|fbclid|gclid|mc_|ref|source|igshid)$/i;
  [...u.searchParams.keys()].forEach(k => {
    if (TRACKING.test(k)) u.searchParams.delete(k);
  });
  u.searchParams.sort();
  let path = u.pathname.replace(/\/+$/, "") || "/";
  // Respect canonical if present (fetched via content script)
  return u.hostname + path + (u.searchParams.toString() ? "?" + u.searchParams.toString() : "");
}
```

**Page Identity Key:** `SHA-256(normalizeUrl(canonical || raw))` — 64-char hex string.

### 4.3 Data Models

#### Workspace
```typescript
interface Workspace {
  id: string;                    // UUID
  name: string;
  ownerId: string;               // User ID
  inviteCode: string;            // 8-char alphanumeric
  createdAt: number;             // epoch ms
  settings: WorkspaceSettings;
}

interface WorkspaceSettings {
  defaultShareLevel: 'hidden' | 'domain' | 'full';
  blockedDomains: string[];      // user-added
  maxRoomSize: number;           // default 20
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
  color: string;                 // assigned highlight color
  workspaces: string[];          // workspace IDs
}
```

#### PageVisit
```typescript
interface PageVisit {
  id: string;                    // UUID
  workspaceId: string;
  userId: string;
  pageKey: string;               // SHA-256 hash
  url: string;                   // only if shareLevel === 'full'
  title: string;
  domain: string;
  shareLevel: 'hidden' | 'domain' | 'full';
  timestamp: number;
  metadata?: {
    canonicalUrl?: string;
    referrer?: string;
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
  color: string;
  quote: {
    exact: string;
    prefix: string;              // ~20 chars before
    suffix: string;              // ~20 chars after
  };
  position: { start: number; end: number }; // char offsets in page text
  xpath: string;                 // structural hint
  commentCount: number;
  createdAt: number;
  updatedAt: number;
}
```

#### Comment
```typescript
interface Comment {
  id: string;
  highlightId: string;
  userId: string;
  content: string;               // markdown
  mentions: string[];            // user IDs
  createdAt: number;
  updatedAt: number;
}
```

#### Presence (ephemeral, not stored)
```typescript
interface PresenceEvent {
  type: 'join' | 'leave' | 'focus' | 'blur' | 'cursor' | 'scroll';
  workspaceId: string;
  pageKey: string;
  userId: string;
  userName: string;
  userColor: string;
  data?: {
    cursorX?: number;
    cursorY?: number;
    scrollY?: number;
    viewportHeight?: number;
  };
  timestamp: number;
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
| WebSocket reconnect time | < 3s |
| Memory usage (content script) | < 10MB |
| CPU idle (no active page) | < 1% |

### 5.2 Scalability
- Support 10,000 concurrent users on free tier (Supabase/Firebase)
- Room-based pub/sub: 1 channel per workspace
- Max 20 users per workspace (configurable)
- Presence events: fan-out only to users on same pageKey
- Visit history: async DB write, not real-time

### 5.3 Reliability
- Offline queue: store visits/highlights locally, sync on reconnect
- WebSocket: exponential backoff reconnect (1s, 2s, 4s, 8s, max 30s)
- Data persistence: 99.9% durability (managed Postgres)
- Extension auto-update: seamless, no user action required

### 5.4 Security
- All API calls over HTTPS/WSS
- JWT tokens for auth, short-lived (15min) + refresh tokens
- Row-level security: users only access their workspace data
- Content Security Policy: strict, no inline scripts
- No page content sent unless user highlights/clips
- CSP hash for injected sidebar/content script

### 5.5 Privacy
- GDPR/CCPA compliant: right to access, delete, export
- Data retention: visits auto-deleted after 30 days
- Highlights retained until user deletes or workspace deleted
- No analytics/tracking beyond operational metrics
- Open-source extension code (backend can be closed)

---

## 6. Technical Architecture

### 6.1 System Diagram
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Browser    │     │  Backend     │     │  Database   │
│  Extension  │────▶│  (Supabase/  │────▶│  (Postgres) │
│  (MV3)      │ WS  │  Node.js)    │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                    │
       │ HTTP               │ Realtime           │
       ▼                    ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Chrome     │     │  Realtime    │     │  Storage    │
│  Storage    │     │  (Presence)  │     │  (Files)    │
│  (Local)    │     │              │     │  (Avatars)  │
└─────────────┘     └──────────────┘     └─────────────┘
```

### 6.2 API Contracts

#### REST (HTTPS)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/google` | Exchange Google ID token for JWT |
| GET | `/workspaces/:id` | Get workspace details |
| POST | `/workspaces` | Create workspace |
| POST | `/workspaces/:id/join` | Join via invite code |
| GET | `/workspaces/:id/members` | List members |
| PATCH | `/workspaces/:id/settings` | Update settings |
| GET | `/visits?workspaceId=&pageKey=&limit=` | Paginated visit feed |
| POST | `/visits` | Record visit (batch supported) |
| GET | `/highlights?workspaceId=&pageKey=` | Get highlights for page |
| POST | `/highlights` | Create highlight |
| PATCH | `/highlights/:id` | Update highlight (color, comment count) |
| DELETE | `/highlights/:id` | Delete highlight |
| GET | `/highlights/:id/comments` | Get comments |
| POST | `/highlights/:id/comments` | Add comment |
| GET | `/users/me/activity` | Get my shared activity log |
| DELETE | `/users/me/activity/:id` | Delete activity entry |

#### Realtime (WebSocket / Supabase Realtime)
| Channel | Event | Payload |
|---------|-------|---------|
| `workspace:{id}:presence` | `join` | `{ userId, name, color, pageKey, shareLevel }` |
| `workspace:{id}:presence` | `leave` | `{ userId, pageKey }` |
| `workspace:{id}:presence` | `cursor` | `{ userId, x, y, pageKey }` |
| `workspace:{id}:presence` | `scroll` | `{ userId, scrollY, pageKey }` |
| `workspace:{id}:highlights` | `insert` | `Highlight` |
| `workspace:{id}:highlights` | `update` | `{ id, changes }` |
| `workspace:{id}:highlights` | `delete` | `{ id }` |
| `workspace:{id}:comments` | `insert` | `Comment` |

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
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "optional_host_permissions": [],
  "incognito": "not_allowed"
}
```

---

## 7. UI/UX Specification

### 7.1 Extension Popup (360px × 480px)
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
│  [Open Sidebar]  [View Full Feed]       │
└─────────────────────────────────────────┘
```

### 7.2 Side Panel (384px wide, full height)
```
┌─────────────────────────────────────────┐
│  [Page Title]                    [👥 2] │
├─────────────────────────────────────────┤
│  [Highlights] [Chat] [Feed]             │
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

### 7.3 On-Page Highlight Rendering
- Background color: user's assigned color at 20% opacity
- Border-left: 3px solid user's color
- Hover: tooltip with user name, timestamp, comment count
- Click: focus sidebar on that highlight

### 7.4 Privacy Settings Page
```
Domain Sharing Rules
────────────────────
Default: Domain-only

[Search domains...]

github.com           ▼ Full        [Edit] [Delete]
google.com           ▼ Domain-only [Edit] [Delete]
gmail.com            ▼ Hidden      [Edit] [Delete]
mybank.com           ▼ Hidden      (locked - default blocklist)
linkedin.com/messaging ▼ Hidden    (locked - default blocklist)

[+ Add Domain Rule]

Quick Actions
────────────────────
[Pause for 1 hour]  [Pause until tomorrow]  [Resume]
```

---

## 8. Build Phases & Milestones

### Phase 1: Foundation (Weeks 1-4)
| Week | Deliverable |
|------|-------------|
| 1 | Project setup: Manifest V3, TypeScript, build pipeline (Vite), Supabase project, CI/CD |
| 2 | Auth: Google OAuth, JWT, workspace create/join, invite links |
| 3 | URL normalization, visit recording, page identity (canonical + hash), visit feed API |
| 4 | Extension popup: workspace switcher, privacy toggle, visit feed display, basic styling |

**Milestone 1:** Team can create workspace, join, visit pages, see each other's visits in feed.

### Phase 2: Presence & Privacy (Weeks 5-7)
| Week | Deliverable |
|------|-------------|
| 5 | WebSocket connection, presence events (join/leave/focus/blur), popup presence badge |
| 6 | Privacy controls: domain rules UI, default blocklist, pause/resume, activity log |
| 7 | Settings page, incognito handling, data deletion, testing & bug fixes |

**Milestone 2:** Real-time presence with full privacy controls, production-ready MVP.

### Phase 3: Highlights & Sidebar (Weeks 8-11)
| Week | Deliverable |
|------|-------------|
| 8 | Text selection → highlight creation, quote/prefix/suffix anchoring, color assignment |
| 9 | Highlight rendering on page, re-anchoring logic (exact → fuzzy → position → XPath) |
| 10 | Side panel: highlights list, comments, text fragment links |
| 11 | Chat tab, markdown support, mentions, notifications |

**Milestone 3:** Full collaborative annotation experience.

### Phase 4: Live Cursors & Polish (Weeks 12-14)
| Week | Deliverable |
|------|-------------|
| 12 | Live cursors + scroll positions, batched updates, viewport awareness |
| 13 | On-page presence avatars, "focus teammate" click-through |
| 14 | Performance optimization, cross-browser testing (Firefox), store preparation |

**Milestone 4:** Chrome Web Store + Firefox Add-ons submission.

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chrome Web Store rejection (broad permissions) | Medium | High | Minimize host_permissions; use activeTab + optional_host_permissions; clear privacy policy |
| Annotation anchoring breaks on dynamic sites | High | Medium | Use Hypothesis's dom-anchor packages; orphaned fallback; test on SPA-heavy sites |
| WebSocket costs at scale | Medium | High | Room-based pub/sub; disconnect idle tabs; start with Supabase free tier |
| Privacy backlash / bad press | Low | Critical | Privacy-first defaults; open-source extension; transparent data practices |
| Firefox WebExtension API gaps | Medium | Low | Develop primarily for Chrome; test on Firefox weekly; use polyfills |
| Team adoption friction (install + invite) | High | Medium | One-click invite links; pre-auth via Google; welcome flow in extension |

---

## 10. Success Metrics

### Activation (Week 1-4)
- Workspaces created: > 50
- Invite acceptance rate: > 60%
- Daily active users (DAU): > 100

### Engagement (Month 2-3)
- Highlights per user/week: > 5
- Pages with teammate presence: > 30% of visits
- Sidebar open rate: > 40% of sessions
- 7-day retention: > 40%

### Growth (Month 3-6)
- Workspaces with > 5 members: > 20%
- Viral coefficient (invites per user): > 0.5
- NPS: > 40

---

## 11. Open Questions

1. **Pricing model:** Free forever? Freemium (room size, history retention)? Team plans?
2. **Self-hosted option:** Enterprise demand? Timeline?
3. **Mobile:** Companion iOS/Android app for feed viewing? Safari extension?
4. **Integrations:** Slack/Notion/Linear webhooks for highlights?
5. **AI features:** Auto-summarize highlights? Suggest related pages? Later phase.

---

## 12. Appendix

### A. Default Blocklist Domains
```
# Banking & Finance
*.bank.*, *.chase.com, *.wellsfargo.com, *.bankofamerica.com, *.citibank.com
# Email
mail.google.com, outlook.live.com, *.protonmail.com
# Health
*.mychart.*, *.epic.com, *.cerner.com
# Social DMs
twitter.com/messages, instagram.com/direct, linkedin.com/messaging
# Password managers
*.1password.com, *.bitwarden.com, *.lastpass.com
```

### B. Per-Domain Query Param Allowlist
```json
{
  "youtube.com": ["v", "list", "t"],
  "github.com": [],
  "docs.google.com": ["id", "documentId"],
  "notion.so": [],
  "twitter.com": ["status"],
  "arxiv.org": ["abs", "pdf"]
}
```

### C. Keyboard Shortcuts (Default)
| Action | Shortcut |
|--------|----------|
| Open sidebar | `Ctrl+Shift+C` / `Cmd+Shift+C` |
| Toggle highlight mode | `Ctrl+Shift+H` |
| Pause/Resume sharing | `Ctrl+Shift+P` |
| Open popup | `Ctrl+Shift+Y` |

---

*End of PRD v1.0*