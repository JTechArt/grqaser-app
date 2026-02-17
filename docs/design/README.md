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
| **Radius** | `12px` / `8px` | Card and button radius |
| **Typography** | Plus Jakarta Sans | All apps (Google Fonts) |

- **Books-admin-app:** Sidebar navigation, desktop-first; accent for primary buttons and active nav.
- **GrqaserApp:** Bottom tab navigation, mobile frame (max-width 390px in mocks); same accent and type.

## Mockups (static HTML)

- **Design hub:** [index.html](./index.html) — entry point to all mockups (open in browser).
- **Books Admin App (web):** [books-admin-app/](./books-admin-app/) — Dashboard, Books, Crawler, Databases, Book detail/edit.
- **GrqaserApp (mobile):** [grqaser-app/](./grqaser-app/) — Home, Book detail, Library, Audio player, Profile.

Mockups are static HTML/CSS only; no backend. Use them as the reference when implementing or updating the live applications (Epic 7 stories).

## Epic 7

UI/UX improvements for both applications are covered in Epic 7. Stories reference these mockups and the design system; implementation must follow the same structure, colors, and patterns.
