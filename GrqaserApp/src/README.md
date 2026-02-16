# GrqaserApp source layout

Feature work should follow this structure. Path aliases (e.g. `@/screens`, `@/state`) are configured in `tsconfig.json` and Babel.

| Folder        | Purpose                                         |
| ------------- | ----------------------------------------------- |
| `screens/`    | Screen components (one per main view).          |
| `navigation/` | React Navigation config, navigators, and types. |
| `state/`      | Redux store and slices (books, player, user).   |
| `services/`   | API and external service clients.               |
| `types/`      | TypeScript types and interfaces.                |
| `constants/`  | Shared constants (app name, defaults, etc.).    |
| `components/` | Reusable UI components.                         |
| `theme/`      | Theming and design tokens.                      |
| `utils/`      | Pure helpers and formatters.                    |
| `assets/`     | Images, fonts, and static assets.               |
