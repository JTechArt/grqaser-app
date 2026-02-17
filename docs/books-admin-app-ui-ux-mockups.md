# Books Admin App — UI/UX Mockups & Front-End Spec

**Epic 6** (Books Admin App) — UX design reference for the merged crawler + database-viewer application.  
**Epic 7, Story 7.3** — HTML mockups live in **docs/design/** (design hub: `docs/design/index.html`). GrqaserApp mobile mockups in `docs/design/grqaser-app/` use the same design system.  
**Audience:** Operators (local-only, no auth).  
**Stories covered:** 6.1 (merge & run), 6.2 (DB versioning), 6.3 (crawler control & config), 6.4 (data view & edit); 7.4 (UI/UX mockups and HTML prototypes).

---

## HTML mockups (Epic 7 · Story 7.3)

Design mockups live in the **main docs folder** under `docs/design/`. The design hub is the single entry point for all mockups (books-admin-app and GrqaserApp).

- **Design hub:** [docs/design/index.html](design/index.html) — entry to Books Admin App and GrqaserApp mockups.
- **Design system:** [docs/design/README.md](design/README.md) — colors, typography, usage (same system for web and mobile).

**Books Admin App mockups** (same design system: slate + teal, Plus Jakarta Sans):

| View | File |
|------|------|
| Dashboard | [docs/design/books-admin-app/dashboard.html](design/books-admin-app/dashboard.html) |
| Books | [docs/design/books-admin-app/books.html](design/books-admin-app/books.html) |
| Crawler | [docs/design/books-admin-app/crawler.html](design/books-admin-app/crawler.html) |
| Databases | [docs/design/books-admin-app/databases.html](design/books-admin-app/databases.html) |
| Book detail & edit | [docs/design/books-admin-app/book-detail.html](design/books-admin-app/book-detail.html) |

From repo root: `open docs/design/index.html` (or open any mock file in a browser).

---

## 1. Scope & story mapping

| Story | Feature | Primary UI |
|-------|---------|------------|
| 6.1 | Single app, crawler + viewer | App shell, all tabs |
| 6.2 | Active/backup DB, promote, delete | **Databases** tab |
| 6.3 | Start/stop crawler, config, status/logs | **Crawler** tab |
| 6.4 | Books list/detail, search/filters, edit book | **Books** tab + Book detail modal |

---

## 2. App shell (global layout)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER (gradient: purple #667eea → #764ba2)                             │
│  📚 Grqaser Books Admin                                                   │
│  View and manage audiobook data (crawler + database-viewer)               │
└─────────────────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Dashboard   │    Books     │   Crawler    │  Databases   │  ← Tab nav
└──────────────┴──────────────┴──────────────┴──────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  [ Active view panel — one of: Dashboard | Books | Crawler | Databases ]  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Header:** Single line title + one-line subtitle; no user menu (no auth).
- **Nav:** Four tabs; active tab underlined in brand purple; keyboard (Tab + Enter) and click.
- **Content:** One visible panel per tab; max-width ~1200px, centered; padding 20–24px.

---

## 3. Dashboard view (6.1)

**Purpose:** At-a-glance stats from the **active** database.

**Wireframe:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total Books │ │ Discovered   │ │  Processed   │ │   Failed    │       │
│  │     142     │ │     12      │ │     125      │ │      5      │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Stats:** 4 cards in a responsive grid (e.g. 4 cols desktop, 2 cols tablet, 1 col mobile).
- **Data source:** `GET /api/v1/stats/overview`; numbers from active DB only.
- **Empty/error:** Show "—" or "0" and optional short message if API fails.

---

## 4. Books view (6.4 — list, filters, detail, edit)

### 4.1 List and filters

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📖 Books                                                                 │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬────────────┐ │
│  │ Search      │ Author      │ Category    │ Status      │ Type       │ │
│  │ [________]  │ [________]  │ [▼ All   ]  │ [▼ All    ]  │ [▼ All  ]  │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┴────────────┘ │
│  Sort: [▼ Date Created]  [🔍 Load Books]  [Search]                      │
├─────────────────────────────────────────────────────────────────────────┤
│  📚 Books List                                        42 books           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ [thumb] Title (ID: 123) 🔗 View on Grqaser.org                      │ │
│  │         by Author · 🎧 Audio Book · ⏱ 1h 20m · 📂 Category · …     │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ [thumb] Next book row…                                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  [← Previous]  [1] [2] [3]  [Next →]                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Filters:** Search (title/author), Author, Category (from API), Status (discovered/processing/completed/failed), Type (audiobook/ebook), Sort.
- **Actions:** "Load Books" (list with filters), "Search" (search API when query present).
- **List:** Thumbnail, title + ID, link to grqaser.org, author, type badge, duration, chapter count, category, crawl status, date. Click row → open **Book detail modal**.
- **Pagination:** Prev/Next + page numbers; 20 items per page.

### 4.2 Book detail modal (view + edit)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Book Title                                                    [×]      │
├─────────────────────────────────────────────────────────────────────────┤
│  [Cover 120×160]  Title · by Author                                       │
│                   🎧 Audio Book   ⏱ 1h 20m                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  📖 Basic Information                                                    │
│  Title | Author | Category | Language | Type | Duration                  │
│  ─────────────────────────────────────────────────────────────────────   │
│  📝 Description                                                           │
│  [Full description text]                                                 │
│  ─────────────────────────────────────────────────────────────────────   │
│  🔗 URLs · 📊 Crawler Information · 📅 Timestamps                         │
│  … Created / Updated / Last edited (manual) / Published                   │
│  [✏️ Edit book]                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Sections:** Basic info, Description, URLs, Crawler info (status, attempts, error if any), Timestamps. Show **"Last edited (manual)"** when `last_edited_at` is set (6.4 AC4).
- **Edit:** Button "Edit book" toggles to **edit form** (same modal).

### 4.3 Book edit form (inline in modal)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Edit book                                                                │
│  Title * [________________]   Author [________________]                  │
│  Description [_____________________________]                             │
│  Category [____]  Language (max 10) [____]  Type [____]                  │
│  Duration (s) [____]  Rating (0–5) [____]                                 │
│  Cover image URL [________________________________]                        │
│  Main audio URL [________________________________]                        │
│  Download URL [________________________________]                          │
│  [Save]  [Cancel]                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Validation:** Title required; URLs http/https; duration ≥ 0; rating 0–5; language length ≤ 10. Inline error message above form on failure.
- **Actions:** Save → PATCH `/api/v1/books/:id` → close form, refresh detail and list. Cancel → hide form, show detail again.

---

## 5. Crawler view (6.3)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🕷️ Crawler control & status                                             │
│  Start and stop the crawler; config applies to the next run.            │
│  Writes go to the active database.                                        │
│  [▶ Start crawler]  [⏹ Stop crawler]  ● Running  [Refresh]              │
├─────────────────────────────────────────────────────────────────────────┤
│  Crawler config                                                           │
│  Mode [▼ full]  Test limit [10]  Update limit [—]                        │
│  Delay (ms) [1000]  Timeout (ms) [30000]                                 │
│  Active DB path (from Databases tab): data/db.v2/grqaser.db              │
│  [Save config]                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌─────────────────┐ ┌──────────┐ ┌──────────┐ …          │
│  │ State    │ │ Last run started│ │ Total    │ │ Processed │             │
│  │ Running  │ │ 17/02 14:30     │ │ 142      │ │ 12       │             │
│  └──────────┘ └─────────────────┘ └──────────┘ └──────────┘             │
├─────────────────────────────────────────────────────────────────────────┤
│  Recent logs                                                              │
│  [17/02 14:30] info – Crawl started…                                     │
│  [17/02 14:31] info – Processing book 123…                               │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Control:** Start (POST `/crawler/start`), Stop (POST `/crawler/stop`). Disable Start when running, disable Stop when stopped. Show state: "● Running" (green) / "○ Stopped" (gray).
- **Config:** Mode, test limit, update limit, delay, timeout; read-only display of active DB path. Save → PUT `/crawler/config`; toast or alert "Config saved. Changes apply to the next run."
- **Status grid:** State, Last run started, Total/Processed/Discovered/Failed/Pending/Completed (from `/crawler/status`).
- **Logs:** Recent entries from `/crawler/logs`; monospace, scrollable.

---

## 6. Databases view (6.2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🗄️ Database versioning                                                   │
│  One database is active; crawler writes and data view read from it.     │
│  Others are backups you can promote or delete.                            │
│  [Refresh list]                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Known databases                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ db.v2                    [Active]                                   │ │
│  │ data/db.v2/grqaser.db                                                │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ db.v1    [Set active]  [Delete backup]                              │ │
│  │ data/db.v1/grqaser.db                                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

- **List:** From GET `/databases`: id, path, `active` flag. Active row: badge "Active" only (no actions). Backup rows: "Set active" + "Delete backup".
- **Set active:** PUT `/databases/active` with `{ id }` → refresh list, optionally refresh Dashboard/Books/Crawler so UI shows new active DB.
- **Delete backup:** Confirm dialog "Delete backup database «id»? This cannot be undone." → DELETE `/databases/:id` → refresh list. Do not offer delete for the active DB.

---

## 7. Key user flows

### 7.1 Switch active database (6.2)

1. User opens **Databases** tab.
2. Sees list: one active, rest backups.
3. Clicks **Set active** on a backup row.
4. App calls PUT `/databases/active`; server swaps active DB and reconnects.
5. List refreshes; new row shows "Active". Dashboard, Books, and Crawler (next run) use the new active DB.

### 7.2 Start crawler and see logs (6.3)

1. User opens **Crawler** tab; optionally edits config and clicks **Save config**.
2. Clicks **Start crawler**.
3. App calls POST `/crawler/start`; state becomes "● Running", Start disabled, Stop enabled.
4. Status grid and logs refresh (or poll); user sees progress.
5. User clicks **Stop crawler** → POST `/crawler/stop` → state "○ Stopped".

### 7.3 Edit a book (6.4)

1. User is on **Books** tab; applies filters and loads list.
2. Clicks a book row → **Book detail** modal opens.
3. Clicks **Edit book** → form replaces detail view in same modal.
4. Edits fields (e.g. title, description, URLs); clicks **Save**.
5. App sends PATCH `/api/v1/books/:id`; on success, form closes, detail view refreshes with updated data and "Last edited (manual)" in Timestamps; list can refresh to show updated row.

---

## 8. Component and UX notes (current design: Slate + Teal)

**Theme:** Slate + teal, sidebar navigation, Plus Jakarta Sans. Implemented in live app and in `books-admin-app/mocks/` (Epic 7).

| Area | Spec |
|------|------|
| **Colors** | Background: #f8fafc (slate-50); cards: white with border #e2e8f0; accent: #0d9488 (teal); accent hover: #0f766e; text: #0f172a; muted: #64748b. |
| **Typography** | Plus Jakarta Sans (Google Fonts); body ~0.9375rem; headings 600–700 weight. |
| **Layout** | Sidebar (260px) + main content; sidebar has brand + nav; active nav = teal left border + teal-100 background. Responsive: sidebar stacks on small screens. |
| **Cards / panels** | White, border 1px solid #e2e8f0, border-radius 12px, light shadow; padding 1–1.5rem. |
| **Buttons** | Primary: teal bg (#0d9488); secondary: white with border. Hover darken. Disabled: reduced opacity. |
| **Forms** | Labels above inputs; focus ring teal; required marked with *; validation error in red panel. |
| **Modals** | Overlay slate; content max-width 800px, border-radius 12px; close via [×] or click outside. |
| **Empty / loading** | "Loading…" or "No books found" / "No databases found" / "No logs" as appropriate. |
| **Errors** | Red-tinted panel (#fef2f2), dark red text; leave content visible where possible. |

---

## 9. Accessibility and responsiveness

- **Keyboard:** Tab through tabs, buttons, and form controls; Enter to activate. Modal: focus trap and focus return on close.
- **Screen readers:** Nav with `role="navigation"` and `aria-label="Main"`; tab panels associated with tab buttons (e.g. `aria-selected`, `aria-controls`); modal `aria-modal="true"` and title.
- **Responsive:** Grids collapse to fewer columns on small viewports; filters and config stack vertically; table-like DB list stacks or wraps actions on narrow screens.
- **Touch:** Buttons and list rows have sufficient hit area (~44px min); no hover-only actions.

---

## 10. Summary

- **Dashboard:** Stats from active DB only (6.1, 6.2).
- **Books:** List with filters and search, pagination, book detail modal with view + edit form; manual edit indicator (6.4).
- **Crawler:** Start/stop, config form, active DB path display, status grid, logs (6.3).
- **Databases:** List of DBs, Set active, Delete backup, refresh (6.2).

This document can be used as the front-end specification for implementation and for QA checks that the UI matches Epic 6 acceptance criteria.
