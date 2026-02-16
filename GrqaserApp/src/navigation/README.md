# Navigation

Tab (bottom tabs) + stack navigation. Types and deep linking are documented here.

## Structure

- **Root:** Stack navigator (`RootNavigator`).
- **Main tabs:** Bottom tab navigator with Home, Library, Player, Favorites, Profile.
- **Stack screens (detail flows):** BookDetail, Search, Category, Settings (pushed over tabs).

## Types

- `TabParamList` — Params for each tab (Home, Library, Player, Favorites, Profile).
- `RootStackParamList` — Params for stack screens (BookDetail with `book`, Search with `initialQuery`, etc.). See `types.ts`.

## Deep linking (future)

Deep linking is **not** implemented in MVP. For future use:

- **Stub:** `deepLinking.ts` exports a config placeholder for React Navigation linking (e.g. `linking.config`).
- **Consider:** Scheme (e.g. `grqaser://`), paths such as `/book/:id`, `/search?q=`, `/settings`. Document in this README or in a product spec when implementing.
