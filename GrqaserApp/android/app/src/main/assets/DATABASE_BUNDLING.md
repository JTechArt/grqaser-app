# Database Bundling

Place `grqaser.db` (the catalog SQLite database exported from books-admin-app)
in this directory. `react-native-sqlite-storage` copies it to the app's
writable storage on first launch via `createFromLocation: 1`.

## Steps

1. Export the catalog DB from books-admin-app (the SQLite file with the `books`
   table).
2. Copy it here as `grqaser.db`.
3. Rebuild the Android app (`npx react-native run-android`).

For iOS, add the same `grqaser.db` file to the Xcode project under
"Copy Bundle Resources" in Build Phases.
