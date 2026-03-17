# VZLAUNCHER — Sprint Planning (Post Sprint 9)

> Generated 2026-03-17. Covers Sprints 10–13.

---

## Feature Audit — What's Already Implemented

### 1. Analytics & Reporting ⚠️ MINIMAL
- ✅ Session History Page (`HistoryPage.tsx`) — paginated table with game ID, category, date, players, duration, tokens, status
- ✅ Cloud API: `getSessionHistory(page, pageSize)` → `/api/v1/sessions`
- ❌ No dashboard with charts/graphs
- ❌ No revenue tracking or financial analytics
- ❌ No usage trends, KPIs, or real-time metrics
- ❌ No CSV/PDF export
- ❌ No date range or operator filters

### 2. Game Management ⚠️ PARTIAL
- ✅ Backend CRUD: `POST /api/v1/admin/games`, `PATCH /api/v1/admin/games/:id`
- ✅ Game schema validation (Zod)
- ✅ Game catalog display from cloud API (`CatalogPage.tsx`, `GameGrid.tsx`)
- ✅ Game store with localStorage cache + static fallback (`gameStore.ts`)
- ❌ No admin UI for game CRUD
- ❌ No image upload or file storage
- ❌ No game enable/disable toggle in UI
- ❌ No bulk operations or scheduling

### 3. Multi-Venue & Super-Admin ⚠️ MINIMAL
- ✅ Venue-scoped auth — operators login per-venue
- ✅ Backend filters by `venueId` (sessions, tokens, operators)
- ✅ Venue token balance in DB
- ✅ Admin endpoint: `POST /api/v1/admin/venues/:id/tokens`
- ❌ No super-admin UI or login
- ❌ No venue provisioning UI
- ❌ No cross-venue analytics
- ❌ No multi-venue dashboard

### 4. UX Polish ✅ GOOD (gaps remain)
- ✅ Loading states on launch, save, history, operators
- ✅ Inline error/warning banners (tokens, bridge offline)
- ✅ CSS transitions, hover effects, glassmorphism
- ✅ Keyframe animations: pulse, fadeUp, glow-pulse
- ✅ Disabled button states (opacity, cursor)
- ❌ No skeleton loaders
- ❌ No toast notifications (no sonner/react-hot-toast)
- ❌ No error boundary for crash recovery
- ❌ No page/route transition animations
- ❌ No accessibility (aria labels)

### 5. Offline Mode & PWA ✅ GOOD (gaps remain)
- ✅ `vite-plugin-pwa` configured (autoUpdate, manifest, icons)
- ✅ Connection store: bridge polling (10s), cloud polling (15s)
- ✅ Session sync queue: `syncStatus`, `syncAllPending()`, auto-retry on reconnect
- ✅ Token reconciliation: `pendingConsumptions`, `reconcile()` on reconnect
- ✅ All stores persisted with Zustand `persist` middleware
- ❌ No custom service worker strategies
- ❌ No offline fallback page
- ❌ No offline indicator in main UI (only in Settings)
- ❌ No background sync API
- ❌ PWA manifest incomplete (screenshots, orientation)

### 6. Notifications & Real-Time ⚠️ MINIMAL
- ✅ Connection status dots in Settings modal
- ✅ Inline error/warning banners
- ✅ Modal alerts (checkout, confirmations)
- ❌ No toast/snackbar library
- ❌ No WebSocket or SSE
- ❌ No push notifications
- ❌ No notification center or history
- ❌ No sound/desktop notifications

---

## Sprint Roadmap

### Sprint 10 — Analytics Dashboard & Game Admin UI
**Goal**: Give operators visibility into usage/revenue and a UI to manage games.

| # | Story | SP | Area |
|---|-------|----|----- |
| 1 | Analytics dashboard page with session count, revenue, avg duration KPIs | 3 | Analytics |
| 2 | Date range filter + operator filter on analytics & history | 2 | Analytics |
| 3 | Session & revenue charts (daily bar chart, category pie chart) | 3 | Analytics |
| 4 | CSV export for session history | 1 | Analytics |
| 5 | Game admin page — list, create, edit, toggle enable/disable | 3 | Game Mgmt |
| 6 | Game image upload with Supabase Storage | 2 | Game Mgmt |

**Total: 14 SP**

### Sprint 11 — Multi-Venue & Super-Admin
**Goal**: Super-admin can provision venues, view cross-venue stats, manage everything.

| # | Story | SP | Area |
|---|-------|----|----- |
| 1 | Super-admin auth (separate login, role guard) | 2 | Multi-Venue |
| 2 | Venue provisioning page — create, edit, deactivate venues | 3 | Multi-Venue |
| 3 | Cross-venue analytics dashboard (aggregate KPIs, per-venue breakdown) | 3 | Multi-Venue |
| 4 | Super-admin operator management across venues | 2 | Multi-Venue |
| 5 | Venue settings page (name, logo, config) | 2 | Multi-Venue |

**Total: 12 SP**

### Sprint 12 — UX Polish & Notifications
**Goal**: Professional feel with toasts, skeletons, error boundaries, and real-time alerts.

| # | Story | SP | Area |
|---|-------|----|----- |
| 1 | Toast notification system (sonner) — success, error, warning, info | 2 | Notifications |
| 2 | Skeleton loaders for game grid, history table, operators list | 2 | UX |
| 3 | Error boundary with crash recovery UI | 1 | UX |
| 4 | Page transition animations (route-level fade/slide) | 2 | UX |
| 5 | Offline indicator bar in main UI + auto-dismiss on reconnect | 1 | Offline/UX |
| 6 | Real-time alerts: low token warning, session expiry countdown | 2 | Notifications |
| 7 | Accessibility pass — aria labels, keyboard nav, focus management | 2 | UX |

**Total: 12 SP**

### Sprint 13 — PWA & Offline Hardening
**Goal**: Bulletproof offline experience, installable PWA, background sync.

| # | Story | SP | Area |
|---|-------|----|----- |
| 1 | Custom service worker with cache-first for assets, network-first for API | 3 | Offline |
| 2 | Offline fallback page | 1 | Offline |
| 3 | Background Sync API for session queue | 2 | Offline |
| 4 | PWA manifest completion (screenshots, shortcuts, orientation) | 1 | Offline |
| 5 | Network-resilient image loading with placeholders | 2 | Offline |
| 6 | Install prompt UI + PWA update notification | 2 | Offline |

**Total: 11 SP**

---

**Grand Total: 49 SP across 4 sprints (24 stories)**
