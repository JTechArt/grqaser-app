# Grqaser design system and mockups

Shared UI/UX design for **books-admin-app** (web) and **GrqaserApp** (mobile). Both applications use the same design rules, colors, and typography so the ecosystem feels consistent.

## Design system (Slate + Teal)

| Token | Value | Usage |
|-------|--------|--------|
| **Background** | `#f8fafc` | App background (slate-50) |
| **Surface / card** | `#ffffff` | Cards, modals, sidebar |
| **Border** | `#e2e8f0` | Borders (slate-200) |
| **Border muted** | `#f1f5f9` | Subtle dividers |
| **Text** | `#0f172a` | Primary text (slate-900) |
| **Text muted** | `#64748b` | Secondary text (slate-500) |
| **Accent** | `#0d9488` | Primary actions, links, active state (teal-600) |
| **Accent hover** | `#0f766e` | Button hover (teal-700) |
| **Accent light** | `#ccfbf1` | Active nav background (teal-100) |
| **Radius** | `12px` / `8px` | Cards 12px, buttons 8px; mobile may use 16px for large cards |
| **Typography** | Plus Jakarta Sans | All apps (Google Fonts) |

**Usage — web vs mobile**

- **Books-admin-app (web):** Sidebar navigation, desktop-first; cards and panels use 12px radius, buttons 8px; accent for primary buttons and active nav.
- **GrqaserApp (mobile):** Bottom tab navigation, mobile frame (max-width 390px in mocks); same palette and Plus Jakarta Sans. Large cards may use 16px radius. **Do not use purple gradient** — use only the slate + teal palette above.

## Mockups (static HTML)

- **Design hub:** [index.html](./index.html) — entry point to all mockups (open in browser).
- **Books Admin App (web):** [books-admin-app/](./books-admin-app/) — Dashboard, Books, Crawler, Databases, Book detail/edit.
- **GrqaserApp (mobile):** [grqaser-app/](./grqaser-app/) — Home, Book detail, Library, Audio player, Profile.

Mockups are static HTML/CSS only; no backend. Use them as the reference when implementing or updating the live applications (Epic 7 stories).

## Epic 7

UI/UX improvements for both applications are covered in Epic 7. Stories reference these mockups and the design system; implementation must follow the same structure, colors, and patterns.

## Epic 8

GrqaserApp mockups updated to reflect Epic 8 UI/UX changes (local data, offline playback, settings):

- **Book detail** (`grqaser-app/book-detail.html`): Added download button for offline MP3 playback (Story 8.2).
- **Library** (`grqaser-app/library.html`): Added remove button on library items for manual removal (Story 8.4); downloaded-badge indicator on books available offline (Story 8.2).
- **Profile / Settings** (`grqaser-app/profile.html`): Major expansion with three new sections:
  - **Storage Usage** — allocated vs used with percentage bar and breakdown by MP3s, databases, other (Story 8.5).
  - **Mobile Data Usage** — monthly data with streaming/downloads/DB update breakdown (Story 8.5).
  - **Downloads** — per-book cleanup and "Clean All" action (Story 8.2).
  - **Catalog Databases** — list loaded DBs (size, date, active badge), refresh/set-active/remove actions, and "Load New Database from URL" (Story 8.3).
- **Story 8.1** (remove categories): No mockup change needed; current mockups already have no categories section.
- **Story 8.4** (Library auto-add): Auto-add is a behavioral change; no new UI elements beyond the remove button already added.
